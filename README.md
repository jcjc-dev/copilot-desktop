# Copilot Desktop

GitHub Copilot is great — but sometimes you want to use its capabilities outside the context of VS Code or the terminal. **Copilot Desktop** gives you an open, web-UI-style chat experience with keyboard shortcuts and quality-of-life features that make it easy to use Copilot for everyday tasks, without needing to subscribe to yet another AI tool.

Built with [Tauri 2](https://v2.tauri.app/) + [SvelteKit](https://svelte.dev/) + Rust, it runs as a lightweight native desktop app while leveraging your existing GitHub Copilot subscription.

## Features

- **Streaming chat** — Real-time message streaming with thinking block support
- **Model selection** — Choose from all available Copilot models, with the ability to show/hide models you don't use
- **Keyboard shortcuts** — Navigate quickly without reaching for the mouse
- **Themes** — Dark, Light, and System modes with native title bar sync
- **Conversation management** — Create, rename, and organize chats backed by a local SQLite database
- **Settings** — Configure default model, system prompt, and theme from a single modal
- **Secure by default** — Content Security Policy, encrypted database (SQLCipher), input validation

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `⌘/Ctrl + N` | New chat |
| `⌘/Ctrl + B` | Toggle sidebar |
| `⌘/Ctrl + ,` | Open settings |
| `⌘/Ctrl + W` | Close current chat |
| `⌘/Ctrl + /` | Focus message input |

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri 2.10 |
| Frontend | Svelte 5, SvelteKit 2, TypeScript 5.9 |
| Styling | Tailwind CSS 4 |
| Backend | Rust, Tokio |
| Database | SQLite (rusqlite + SQLCipher) |
| AI | GitHub Copilot SDK |
| Build tool | Vite 7 |

## Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://www.rust-lang.org/tools/install) 1.77+
- Tauri CLI — installed automatically via npm
- A [GitHub Copilot](https://github.com/features/copilot) subscription

## Getting Started

```sh
# Install dependencies
make install

# Start the dev server
make dev
```

The app will launch as a native window with hot-reload enabled.

## Building

```sh
# Production build
make build
```

Build artifacts are written to `src-tauri/target/release/`.

## Testing

```sh
# Run all tests (frontend + Rust)
make test

# Frontend unit tests only
make test-frontend

# Rust tests only
make test-rust

# E2E tests (Playwright)
make test-e2e

# Lint everything
make lint
```

## Docker

A Docker Compose setup is provided for CI and reproducible test environments:

```sh
# Run tests in Docker
make docker-build && docker compose run test

# Or lint
docker compose run lint
```

## Project Structure

```
copilot-desktop/
├── src/                    # SvelteKit frontend
│   ├── lib/
│   │   ├── api/            # Tauri IPC bindings
│   │   ├── components/     # UI components (chat, layout, common)
│   │   ├── services/       # App & chat orchestration
│   │   ├── stores/         # Svelte stores (chat, models, theme, settings)
│   │   └── utils/          # Shortcuts, logger, error utilities
│   └── routes/             # SvelteKit pages
├── src-tauri/              # Rust backend
│   └── src/
│       ├── commands.rs     # Tauri IPC command handlers
│       ├── db.rs           # SQLite database operations
│       ├── state.rs        # App state management
│       └── error.rs        # Typed error handling
├── e2e/                    # Playwright E2E tests
├── Makefile                # Dev workflow commands
└── docker-compose.yml      # CI environment
```

## License

Private — not currently published under an open-source license.
