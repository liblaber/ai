#!/bin/bash

# Convenience script to run e2e tests from the parent directory
# Usage: ./run-e2e-tests.sh [headed|ui|debug|headless]

set -e

# Default to headed mode if no argument provided
MODE=${1:-headed}

echo "🚀 Running liblab.ai E2E tests in $MODE mode..."

# Check if we're in the right directory
if [ ! -d "e2e-tests" ]; then
    echo "❌ Error: e2e-tests directory not found. Make sure you're in the project root."
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

# Navigate to e2e-tests directory and run the tests
cd e2e-tests

# Run the tests using the script we created
./run-tests.sh $MODE

echo "✅ E2E tests completed!" 