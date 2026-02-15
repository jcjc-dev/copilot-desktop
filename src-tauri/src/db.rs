use rusqlite::{Connection, Result as SqlResult, params};
use crate::commands::{Conversation, Message};

/// Derives a database encryption key from the database file path.
/// This provides basic encryption at rest tied to the current file location.
fn derive_encryption_key(path: &str) -> String {
    // Simple key derivation: hash the path with a fixed salt.
    // A production system should use OS keychain or hardware-backed storage.
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut hasher = DefaultHasher::new();
    "copilot-desktop-db-salt-2024".hash(&mut hasher);
    path.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

pub fn open_db(path: &str) -> SqlResult<Connection> {
    // Restrict file permissions before opening so the DB file is created with safe mode
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if std::path::Path::new(path).exists() {
            let perms = std::fs::Permissions::from_mode(0o600);
            std::fs::set_permissions(path, perms).ok();
        }
    }

    let conn = Connection::open(path)?;

    // Enable SQLCipher encryption at rest
    let key = derive_encryption_key(path);
    conn.pragma_update(None, "key", &key)?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    // Set restrictive permissions on newly created DB files
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o600);
        std::fs::set_permissions(path, perms).ok();
    }

    Ok(conn)
}

pub fn init_schema(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            model TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    ")?;
    Ok(())
}

pub fn get_setting(conn: &Connection, key: &str) -> SqlResult<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query(params![key])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row.get(0)?))
    } else {
        Ok(None)
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        params![key, value],
    )?;
    Ok(())
}

pub fn list_conversations(conn: &Connection, limit: Option<i64>, offset: Option<i64>) -> SqlResult<Vec<Conversation>> {
    let limit = limit.unwrap_or(50);
    let offset = offset.unwrap_or(0);
    let mut stmt = conn.prepare(
        "SELECT id, title, model, created_at, updated_at FROM conversations ORDER BY updated_at DESC LIMIT ?1 OFFSET ?2",
    )?;
    let rows = stmt.query_map(params![limit, offset], |row| {
        Ok(Conversation {
            id: row.get(0)?,
            title: row.get(1)?,
            model: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;
    rows.collect()
}

pub fn create_conversation(conn: &Connection, id: &str, title: &str, model: Option<&str>) -> SqlResult<Conversation> {
    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "INSERT INTO conversations (id, title, model) VALUES (?1, ?2, ?3)",
        params![id, title, model],
    )?;
    let convo = tx.query_row(
        "SELECT id, title, model, created_at, updated_at FROM conversations WHERE id = ?1",
        params![id],
        |row| {
            Ok(Conversation {
                id: row.get(0)?,
                title: row.get(1)?,
                model: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )?;
    tx.commit()?;
    Ok(convo)
}

pub fn get_conversation(conn: &Connection, id: &str) -> SqlResult<Option<Conversation>> {
    let mut stmt = conn.prepare("SELECT id, title, model, created_at, updated_at FROM conversations WHERE id = ?1")?;
    let mut rows = stmt.query(params![id])?;
    if let Some(row) = rows.next()? {
        Ok(Some(Conversation {
            id: row.get(0)?,
            title: row.get(1)?,
            model: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        }))
    } else {
        Ok(None)
    }
}

pub fn get_conversation_messages(conn: &Connection, conversation_id: &str, limit: Option<i64>, offset: Option<i64>) -> SqlResult<Vec<Message>> {
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);
    let mut stmt = conn.prepare(
        "SELECT id, conversation_id, role, content, created_at FROM messages WHERE conversation_id = ?1 ORDER BY created_at ASC LIMIT ?2 OFFSET ?3",
    )?;
    let rows = stmt.query_map(params![conversation_id, limit, offset], |row| {
        Ok(Message {
            id: row.get(0)?,
            conversation_id: row.get(1)?,
            role: row.get(2)?,
            content: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    rows.collect()
}

pub fn delete_conversation(conn: &Connection, id: &str) -> SqlResult<()> {
    let tx = conn.unchecked_transaction()?;
    tx.execute("DELETE FROM messages WHERE conversation_id = ?1", params![id])?;
    tx.execute("DELETE FROM conversations WHERE id = ?1", params![id])?;
    tx.commit()
}

pub fn save_message(conn: &Connection, msg: &Message) -> SqlResult<()> {
    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![msg.id, msg.conversation_id, msg.role, msg.content, msg.created_at],
    )?;
    tx.execute(
        "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?1",
        params![msg.conversation_id],
    )?;
    tx.commit()
}

pub fn update_conversation_title(conn: &Connection, id: &str, title: &str) -> SqlResult<()> {
    conn.execute(
        "UPDATE conversations SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![title, id],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    fn setup_test_db() -> (Connection, NamedTempFile) {
        let tmp = NamedTempFile::new().unwrap();
        let conn = open_db(tmp.path().to_str().unwrap()).unwrap();
        init_schema(&conn).unwrap();
        (conn, tmp)
    }

    #[test]
    fn test_init_schema() {
        let (conn, _tmp) = setup_test_db();
        let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table'").unwrap();
        let tables: Vec<String> = stmt.query_map([], |row| row.get(0)).unwrap()
            .filter_map(|r| r.ok())
            .collect();
        assert!(tables.contains(&"settings".to_string()));
        assert!(tables.contains(&"conversations".to_string()));
        assert!(tables.contains(&"messages".to_string()));
    }

    #[test]
    fn test_settings_crud() {
        let (conn, _tmp) = setup_test_db();

        assert_eq!(get_setting(&conn, "theme").unwrap(), None);

        set_setting(&conn, "theme", "dark").unwrap();
        assert_eq!(get_setting(&conn, "theme").unwrap(), Some("dark".to_string()));

        set_setting(&conn, "theme", "light").unwrap();
        assert_eq!(get_setting(&conn, "theme").unwrap(), Some("light".to_string()));
    }

    #[test]
    fn test_conversation_crud() {
        let (conn, _tmp) = setup_test_db();

        let convo = create_conversation(&conn, "test-id-1", "Test Chat", Some("gpt-4")).unwrap();
        assert_eq!(convo.id, "test-id-1");
        assert_eq!(convo.title, "Test Chat");
        assert_eq!(convo.model, Some("gpt-4".to_string()));

        let convos = list_conversations(&conn, None, None).unwrap();
        assert_eq!(convos.len(), 1);

        let fetched = get_conversation(&conn, "test-id-1").unwrap();
        assert!(fetched.is_some());
        assert_eq!(fetched.unwrap().title, "Test Chat");

        let missing = get_conversation(&conn, "nonexistent").unwrap();
        assert!(missing.is_none());

        delete_conversation(&conn, "test-id-1").unwrap();
        let convos = list_conversations(&conn, None, None).unwrap();
        assert_eq!(convos.len(), 0);
    }

    #[test]
    fn test_message_crud() {
        let (conn, _tmp) = setup_test_db();

        create_conversation(&conn, "convo-1", "Test", None).unwrap();

        let msg1 = crate::commands::Message {
            id: "msg-1".to_string(),
            conversation_id: "convo-1".to_string(),
            role: "user".to_string(),
            content: "Hello!".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
        };
        save_message(&conn, &msg1).unwrap();

        let msg2 = crate::commands::Message {
            id: "msg-2".to_string(),
            conversation_id: "convo-1".to_string(),
            role: "assistant".to_string(),
            content: "Hi there!".to_string(),
            created_at: "2026-01-01T00:00:01Z".to_string(),
        };
        save_message(&conn, &msg2).unwrap();

        let msgs = get_conversation_messages(&conn, "convo-1", None, None).unwrap();
        assert_eq!(msgs.len(), 2);
        assert_eq!(msgs[0].role, "user");
        assert_eq!(msgs[1].role, "assistant");
    }

    #[test]
    fn test_conversation_title_update() {
        let (conn, _tmp) = setup_test_db();

        create_conversation(&conn, "convo-1", "Original", None).unwrap();
        update_conversation_title(&conn, "convo-1", "Updated Title").unwrap();

        let convo = get_conversation(&conn, "convo-1").unwrap().unwrap();
        assert_eq!(convo.title, "Updated Title");
    }

    #[test]
    fn test_cascade_delete() {
        let (conn, _tmp) = setup_test_db();

        create_conversation(&conn, "convo-1", "Test", None).unwrap();
        let msg = crate::commands::Message {
            id: "msg-1".to_string(),
            conversation_id: "convo-1".to_string(),
            role: "user".to_string(),
            content: "Hello".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
        };
        save_message(&conn, &msg).unwrap();

        delete_conversation(&conn, "convo-1").unwrap();
        let msgs = get_conversation_messages(&conn, "convo-1", None, None).unwrap();
        assert_eq!(msgs.len(), 0);
    }

    #[test]
    fn test_multiple_conversations_ordering() {
        let (conn, _tmp) = setup_test_db();

        create_conversation(&conn, "old", "Old Chat", None).unwrap();
        create_conversation(&conn, "new", "New Chat", None).unwrap();

        // Force distinct timestamps so ordering is deterministic
        conn.execute(
            "UPDATE conversations SET updated_at = '2026-01-01T00:00:00' WHERE id = 'old'",
            [],
        ).unwrap();
        conn.execute(
            "UPDATE conversations SET updated_at = '2026-01-02T00:00:00' WHERE id = 'new'",
            [],
        ).unwrap();

        let convos = list_conversations(&conn, None, None).unwrap();
        assert_eq!(convos.len(), 2);
        // Most recent first
        assert_eq!(convos[0].id, "new");
    }

    // --- Integration-style tests ---

    #[test]
    fn test_full_conversation_workflow() {
        let (conn, _tmp) = setup_test_db();

        // 1. Create a conversation
        let convo = create_conversation(&conn, "workflow-1", "My Project Help", Some("gpt-4")).unwrap();
        assert_eq!(convo.title, "My Project Help");

        // 2. Add multiple messages
        for i in 0..5 {
            let role = if i % 2 == 0 { "user" } else { "assistant" };
            let msg = crate::commands::Message {
                id: format!("msg-{}", i),
                conversation_id: "workflow-1".to_string(),
                role: role.to_string(),
                content: format!("Message {}", i),
                created_at: format!("2026-01-01T00:00:0{}Z", i),
            };
            save_message(&conn, &msg).unwrap();
        }

        // 3. Verify messages are ordered correctly
        let msgs = get_conversation_messages(&conn, "workflow-1", None, None).unwrap();
        assert_eq!(msgs.len(), 5);
        assert_eq!(msgs[0].content, "Message 0");
        assert_eq!(msgs[4].content, "Message 4");

        // 4. Update title
        update_conversation_title(&conn, "workflow-1", "Updated Project Help").unwrap();
        let convo = get_conversation(&conn, "workflow-1").unwrap().unwrap();
        assert_eq!(convo.title, "Updated Project Help");

        // 5. Create another conversation
        create_conversation(&conn, "workflow-2", "Another Chat", None).unwrap();
        let convos = list_conversations(&conn, None, None).unwrap();
        assert_eq!(convos.len(), 2);

        // 6. Delete first conversation - messages should cascade
        delete_conversation(&conn, "workflow-1").unwrap();
        let msgs = get_conversation_messages(&conn, "workflow-1", None, None).unwrap();
        assert_eq!(msgs.len(), 0);
        let convos = list_conversations(&conn, None, None).unwrap();
        assert_eq!(convos.len(), 1);
        assert_eq!(convos[0].id, "workflow-2");
    }

    #[test]
    fn test_settings_workflow() {
        let (conn, _tmp) = setup_test_db();

        // Initial state - no settings
        assert_eq!(get_setting(&conn, "theme").unwrap(), None);
        assert_eq!(get_setting(&conn, "default_model").unwrap(), None);
        assert_eq!(get_setting(&conn, "system_prompt").unwrap(), None);

        // Set all settings
        set_setting(&conn, "theme", "dark").unwrap();
        set_setting(&conn, "default_model", "gpt-4o").unwrap();
        set_setting(&conn, "system_prompt", "You are a helpful assistant").unwrap();

        // Verify
        assert_eq!(get_setting(&conn, "theme").unwrap(), Some("dark".to_string()));
        assert_eq!(get_setting(&conn, "default_model").unwrap(), Some("gpt-4o".to_string()));
        assert_eq!(get_setting(&conn, "system_prompt").unwrap(), Some("You are a helpful assistant".to_string()));

        // Update
        set_setting(&conn, "theme", "light").unwrap();
        assert_eq!(get_setting(&conn, "theme").unwrap(), Some("light".to_string()));
        // Other settings unchanged
        assert_eq!(get_setting(&conn, "default_model").unwrap(), Some("gpt-4o".to_string()));
    }

    #[test]
    fn test_empty_content_message() {
        let (conn, _tmp) = setup_test_db();
        create_conversation(&conn, "c1", "Test", None).unwrap();

        let msg = crate::commands::Message {
            id: "empty-msg".to_string(),
            conversation_id: "c1".to_string(),
            role: "assistant".to_string(),
            content: "".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
        };
        save_message(&conn, &msg).unwrap();

        let msgs = get_conversation_messages(&conn, "c1", None, None).unwrap();
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0].content, "");
    }

    #[test]
    fn test_special_characters_in_content() {
        let (conn, _tmp) = setup_test_db();
        create_conversation(&conn, "c1", "Test with 'quotes' & <tags>", None).unwrap();

        let convo = get_conversation(&conn, "c1").unwrap().unwrap();
        assert_eq!(convo.title, "Test with 'quotes' & <tags>");

        let msg = crate::commands::Message {
            id: "special-msg".to_string(),
            conversation_id: "c1".to_string(),
            role: "user".to_string(),
            content: "SELECT * FROM users WHERE name = 'Robert'; DROP TABLE users;--".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
        };
        save_message(&conn, &msg).unwrap();

        let msgs = get_conversation_messages(&conn, "c1", None, None).unwrap();
        assert!(msgs[0].content.contains("DROP TABLE"));
    }

    #[test]
    fn test_unicode_content() {
        let (conn, _tmp) = setup_test_db();
        create_conversation(&conn, "unicode", "日本語テスト 🎉", None).unwrap();

        let convo = get_conversation(&conn, "unicode").unwrap().unwrap();
        assert_eq!(convo.title, "日本語テスト 🎉");

        let msg = crate::commands::Message {
            id: "unicode-msg".to_string(),
            conversation_id: "unicode".to_string(),
            role: "user".to_string(),
            content: "こんにちは世界 🌍 café résumé naïve".to_string(),
            created_at: "2026-01-01T00:00:00Z".to_string(),
        };
        save_message(&conn, &msg).unwrap();

        let msgs = get_conversation_messages(&conn, "unicode", None, None).unwrap();
        assert!(msgs[0].content.contains("こんにちは"));
        assert!(msgs[0].content.contains("🌍"));
    }
}
