#!/bin/bash

set -e

echo "★═══════════════════════════════════════★"
echo "      🦙 liblab AI Builder Setup 🦙"
echo "★═══════════════════════════════════════★"

if [[ "$OSTYPE" == "darwin"* ]]; then
    SED_IN_PLACE=("sed" "-i" "")
else
    SED_IN_PLACE=("sed" "-i")
fi

# Generate AES key if not exists
echo "📋 Checking for encryption key..."
if [ ! -f .env ] || ! grep -q "^ENCRYPTION_KEY=." .env; then
    echo "⏳ Generating AES-256-GCM key..."
    # Generate a cryptographically secure random 32-byte (256-bit) key
    # Using /dev/urandom for better entropy
    ENCRYPTION_KEY=$(dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64)

    # Verify the key length (base64 encoding of 32 bytes should be 44 characters)
    if [ ${#ENCRYPTION_KEY} -ne 44 ]; then
        echo "❌ Failed to generate proper encryption key"
        exit 1
    fi

    # Add to .env file
    if [ -f .env ]; then
        echo "ENCRYPTION_KEY='$ENCRYPTION_KEY'" >> .env
    else
        echo "ENCRYPTION_KEY='$ENCRYPTION_KEY'" > .env
    fi
    echo "✅ Generated and stored AES-256-GCM encryption key."
fi

# Check if ngrok is installed, otherwise install it
echo "📋 Checking if ngrok is installed..."
if ! command -v ngrok &> /dev/null; then
    echo "⏳ ngrok not found, installing..."

    # Check OS type and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install ngrok
        else
            echo "❌ Homebrew not found. Please install Homebrew first or manually install ngrok from https://ngrok.com/download"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
        echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list >/dev/null
        sudo apt update && sudo apt install ngrok
    else
        echo "❌ Unsupported OS. Please install ngrok manually from https://ngrok.com/download"
        exit 1
    fi

    if command -v ngrok &> /dev/null; then
        echo "✅ ngrok installed successfully."
    else
        echo "❌ Failed to install ngrok. Please install manually from https://ngrok.com/download"
        exit 1
    fi
else
    echo "✅ ngrok is already installed."
fi

# Check if ngrok is authenticated
echo "📋 Checking ngrok authentication..."
if ! ngrok config check &> /dev/null; then
    echo "⚠️ ngrok is not authenticated. Please visit https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "⚠️ After getting your authtoken, please run: ngrok config add-authtoken YOUR_AUTHTOKEN"
    exit 1
fi

# Check for .env file and create if it doesn't exist
echo "📋 Checking for .env file..."
if [ ! -f .env ]; then
    echo "⏳ .env file not found, creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example."
    else
        echo "❌ .env.example file not found. Please ensure .env.example exists."
        exit 1
    fi
else
    echo "✅ .env file already exists."
fi

# Check for required environment variables
echo "📋 Validating environment variables..."
if ! grep -q "^ANTHROPIC_API_KEY=." .env; then
    echo "⚠️ ANTHROPIC_API_KEY not found or empty in .env file."
    read -p "Please enter your Anthropic API key: " anthropic_key
    echo "ANTHROPIC_API_KEY='$anthropic_key'" >> .env
    echo "✅ Updated ANTHROPIC_API_KEY in .env file."
fi

if ! grep -q "BASE_URL" .env; then
    echo "⚠️ BASE_URL not found in .env file."
    read -p "Please enter your base URL (or press Enter for default 'http://localhost:5173'): " base_url
    if [ -z "$base_url" ]; then
        base_url="http://localhost:5173"
    fi
    echo "BASE_URL=$base_url" >> .env
    echo "✅ Added BASE_URL to .env file."
fi

if ! grep -q "VITE_ENV_NAME" .env; then
    echo "⚠️ VITE_ENV_NAME not found in .env file."
    echo "VITE_ENV_NAME=local" >> .env
    echo "✅ Added VITE_ENV_NAME to .env file."
fi

# Install dependencies
echo "📋 Installing dependencies..."
pnpm install
echo "✅ Dependencies installed successfully."

# Generate Prisma client
echo "📋 Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated successfully."

echo ""
echo "★═══════════════════════════════════════★"
echo "     🎉 Setup completed successfully! 🎉"
echo "★═══════════════════════════════════════★"
echo ""

echo "        ┬  ┬┌┐ ┬  ┌─┐┌┐   ┌─┐┬"
echo "        │  │├┴┐│  ├─┤├┴┐  ├─┤│"
echo "        ┴─┘┴└─┘┴─┘┴ ┴└─┘  ┴ ┴┴"

echo ""
echo "Run the development server with:"
echo ""
echo "\033[1;32mpnpm run dev\033[0m"
echo ""
