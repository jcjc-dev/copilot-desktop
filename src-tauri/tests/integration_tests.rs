// Integration tests for the copilot-desktop crate.
//
// TODO: Test delete_conversation atomicity
//
// delete_conversation should be wrapped in a transaction so that if deleting
// associated messages fails, the conversation row is not removed either.
// Suggested test:
//   1. Create a conversation with messages via the public DB API
//   2. Simulate a failure mid-delete (e.g., drop the messages table or use
//      a mock that errors on message deletion)
//   3. Verify the conversation still exists (transaction rolled back)
//
// This requires either #[cfg(test)] pub exports on the db module or
// testing through the Tauri command layer with a test harness.
