.PHONY: dev build test test-rust test-frontend test-e2e test-smoke test-all check lint lint-rust lint-frontend clean install docker-build docker-test help

# Default target
help:
	@echo "copilot-desktop build targets:"
	@echo "  make install        - Install all dependencies"
	@echo "  make dev            - Start development server (Tauri + SvelteKit)"
	@echo "  make build          - Build production app"
	@echo "  make test           - Run all tests"
	@echo "  make test-rust      - Run Rust backend tests"
	@echo "  make test-frontend  - Run frontend unit + component tests"
	@echo "  make test-e2e       - Run E2E tests"
	@echo "  make lint           - Run all linters"
	@echo "  make lint-rust      - Run Rust linter (clippy)"
	@echo "  make lint-frontend  - Run frontend linter (eslint + svelte-check)"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make test-smoke     - Run smoke test (dev server + basic checks)"
	@echo "  make test-all       - Run all tests including smoke"
	@echo "  make check          - Full check (build + all tests)"
	@echo "  make docker-build   - Build using Docker"
	@echo "  make docker-test    - Run tests in Docker"

# Install dependencies
install:
	npm install
	cd src-tauri && cargo fetch

# Development
dev:
	npx tauri dev

# Development with verbose logging (backend + frontend)
# Override the per-event timeout (default 120s) with COPILOT_EVENT_TIMEOUT_SECS.
dev-verbose:
	COPILOT_VERBOSE=1 VITE_VERBOSE=true npx tauri dev

# Production build
build:
	npx tauri build

# Testing
test: test-rust test-frontend

test-rust:
	cd src-tauri && cargo test --lib

test-frontend:
	npx vitest run

test-e2e:
	npx playwright test

# Linting
lint: lint-rust lint-frontend

lint-rust:
	cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings
	cd src-tauri && cargo fmt --all -- --check

lint-frontend:
	npx eslint . --ext .ts,.svelte
	npx svelte-check --tsconfig ./tsconfig.json

# Clean
clean:
	rm -rf build node_modules/.vite
	cd src-tauri && cargo clean

# Smoke test - validates full app starts correctly
test-smoke:
	bash scripts/smoke-test.sh

# Run all tests including smoke
test-all: test test-smoke

# Full check (build + all tests)
check:
	bash scripts/check-build.sh

# Docker
docker-build:
	docker compose build

docker-test:
	docker compose run --rm test
