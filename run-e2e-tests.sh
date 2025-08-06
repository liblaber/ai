#!/bin/bash

# Convenience script to run e2e tests from the parent directory
# Usage: ./run-e2e-tests.sh [headed|ui|debug|headless]

set -e

# Default to headed mode if no argument provided
MODE=${1:-headed}

echo "🚀 Running liblab.ai E2E tests in $MODE mode..."

# Check if we're in the right directory
if [ ! -d "tests/e2e" ]; then
    echo "❌ Error: tests/e2e directory not found. Make sure you're in the project root."
    exit 1
fi

# Check if the main app is running
echo "🔍 Checking if the main application is running..."
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Error: The main application is not running on http://localhost:3000"
    echo ""
    echo "Please start your application first:"
    echo "  • For local development: npm run dev"
    echo "  • For Docker: pnpm run quickstart"
    echo "  • For production: npm run start"
    echo ""
    echo "Then run the tests again."
    exit 1
fi

# Navigate to tests/e2e directory
cd tests/e2e

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Run the tests based on the mode using pnpm
case $MODE in
    "headed")
        echo " Running tests with browser visible..."
        pnpm run test:headed
        ;;
    "ui")
        echo " Running tests with Playwright UI..."
        pnpm run test:ui
        ;;
    "debug")
        echo "🐛 Running tests in debug mode..."
        pnpm run test:debug
        ;;
    "headless")
        echo "👻 Running tests in headless mode..."
        pnpm test
        ;;
    *)
        echo "❌ Invalid mode: $MODE"
        echo "Available modes: headed, ui, debug, headless"
        exit 1
        ;;
esac

echo "✅ E2E tests completed!"
