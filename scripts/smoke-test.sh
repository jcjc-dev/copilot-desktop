#!/bin/bash
set -e

echo "🔥 Running smoke test..."

# Start the SvelteKit dev server only (not full Tauri — that needs a display)
echo "Starting dev server..."
npm run dev &
DEV_PID=$!

# Wait for dev server
echo "Waiting for dev server on port 5173..."
for i in $(seq 1 30); do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Dev server is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Dev server failed to start"
    kill $DEV_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# Test that the page loads and has expected content
echo "Checking page content..."
PAGE_CONTENT=$(curl -s http://localhost:5173)

# SvelteKit apps are client-rendered; check for the SvelteKit shell
if echo "$PAGE_CONTENT" | grep -q "sveltekit"; then
  echo "✅ Page contains SvelteKit app shell"
else
  echo "❌ Page missing SvelteKit app shell"
  kill $DEV_PID 2>/dev/null || true
  exit 1
fi

if echo "$PAGE_CONTENT" | grep -q "app.css\|tailwind\|stylesheet"; then
  echo "✅ CSS is loaded"
else
  echo "⚠️  CSS might not be loading (non-fatal)"
fi

# Test that the Rust backend compiles
echo "Checking Rust backend compiles..."
cd src-tauri
if cargo check --quiet 2>&1; then
  echo "✅ Rust backend compiles"
else
  echo "❌ Rust backend compilation failed"
  cd ..
  kill $DEV_PID 2>/dev/null || true
  exit 1
fi
cd ..

# Test CLI path detection (compile and run a quick test)
echo "Checking Copilot CLI detection..."
cd src-tauri
if cargo test test_find_copilot_cli_path --quiet 2>&1; then
  echo "✅ CLI path detection test passes"
else
  echo "⚠️  CLI path detection test failed (copilot CLI might not be installed)"
fi
cd ..

# Clean up
echo "Cleaning up..."
kill $DEV_PID 2>/dev/null || true
wait $DEV_PID 2>/dev/null || true

echo ""
echo "🎉 Smoke test passed!"
