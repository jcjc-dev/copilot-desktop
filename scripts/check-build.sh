#!/bin/bash
set -e

echo "🔨 Checking build..."

# Frontend build
echo "Building frontend..."
npm run build --quiet
echo "✅ Frontend builds"

# Rust check
echo "Checking Rust backend..."
cd src-tauri && cargo check --quiet 2>&1
echo "✅ Rust compiles"

# Run all tests
echo "Running Rust tests..."
cargo test --quiet 2>&1
echo "✅ Rust tests pass"

cd ..
echo "Running frontend tests..."
npx vitest run --reporter=dot 2>&1
echo "✅ Frontend tests pass"

echo ""
echo "🎉 All checks passed!"
