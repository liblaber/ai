#!/bin/bash

# Script to run Playwright tests for liblab.ai
# Usage: ./run-tests.sh [headed|ui|debug]

set -e

# Default to headed mode if no argument provided
MODE=${1:-headed}

echo "🚀 Starting Playwright tests in $MODE mode..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "playwright.config.ts" ]; then
    echo "❌ Error: This script must be run from the e2e-tests directory"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run the tests based on the mode
case $MODE in
    "headed")
        echo "🔍 Running tests with browser visible..."
        npm run test:headed
        ;;
    "ui")
        echo "🎨 Running tests with Playwright UI..."
        npm run test:ui
        ;;
    "debug")
        echo "🐛 Running tests in debug mode..."
        npm run test:debug
        ;;
    "headless")
        echo "👻 Running tests in headless mode..."
        npm test
        ;;
    *)
        echo "❌ Invalid mode: $MODE"
        echo "Available modes: headed, ui, debug, headless"
        exit 1
        ;;
esac

echo "✅ Tests completed!" 