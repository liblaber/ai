#!/bin/bash

# liblab AI Builder Setup Script
# OS Compatibility: macOS, Linux, Windows (Git Bash, Cygwin, WSL)
# Requirements: bash, pnpm, node.js, npx, awk, grep, curl, cp, mv, read
# Optional: ngrok, openssl, powershell (Windows), brew (macOS), sudo (Linux)

set -e

echo "★═══════════════════════════════════════★"
echo "      🦙 liblab AI Builder Setup 🦙"
echo "★═══════════════════════════════════════★"

# Detect OS and set appropriate commands
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    OS_TYPE="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    OS_TYPE="linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows (Git Bash, Cygwin, or WSL)
    OS_TYPE="windows"
else
    # Fallback
    OS_TYPE="unknown"
fi

# Check if ngrok is installed, otherwise install it
echo "📋 Checking if ngrok is installed..."
if ! command -v ngrok &> /dev/null; then
    echo "⏳ ngrok not found, installing..."

    # Check OS type and install accordingly
    if [[ "$OS_TYPE" == "macos" ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install ngrok
        else
            echo "❌ Homebrew not found. Please install Homebrew first or manually install ngrok from https://ngrok.com/download"
            exit 1
        fi
    elif [[ "$OS_TYPE" == "linux" ]]; then
        # Linux
        curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
        echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list >/dev/null
        sudo apt update && sudo apt install ngrok
    elif [[ "$OS_TYPE" == "windows" ]]; then
        # Windows - provide instructions for manual installation
        echo "❌ ngrok not found on Windows."
        echo "📋 Please install ngrok manually:"
        echo "   1. Download from: https://ngrok.com/download"
        echo "   2. Extract the zip file"
        echo "   3. Add ngrok.exe to your PATH or run from the extracted directory"
        echo "   4. Run: ngrok config add-authtoken YOUR_AUTHTOKEN"
        echo ""
        echo "⚠️ After installing ngrok, run this setup script again."
        exit 1
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

# Generate AES key if not exists
echo "📋 Checking for encryption key..."
if [ ! -f .env ] || ! grep -q "^ENCRYPTION_KEY=." .env; then
    echo "⏳ Generating AES-256-GCM key..."
    # Generate a cryptographically secure random 32-byte (256-bit) key
    # Use different methods based on OS for better compatibility
    if [[ "$OS_TYPE" == "windows" ]]; then
        # Windows - try PowerShell first, fallback to other methods
        if command -v powershell &> /dev/null; then
            ENCRYPTION_KEY=$(powershell -Command "[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))")
        elif command -v openssl &> /dev/null; then
            ENCRYPTION_KEY=$(openssl rand -base64 32)
        else
            # Fallback for Windows without PowerShell or OpenSSL
            echo "❌ Unable to generate encryption key. Please install OpenSSL or ensure PowerShell is available."
            exit 1
        fi
    else
        # Unix-like systems (macOS, Linux)
        if command -v openssl &> /dev/null; then
            ENCRYPTION_KEY=$(openssl rand -base64 32)
        else
            # Fallback to dd method
            ENCRYPTION_KEY=$(dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64)
        fi
    fi

    # Verify the key length (base64 encoding of 32 bytes should be 44 characters)
    if [ ${#ENCRYPTION_KEY} -ne 44 ]; then
        echo "❌ Failed to generate proper encryption key"
        exit 1
    fi

    # Try to update existing empty ENCRYPTION_KEY line, otherwise add new one
    if [ -f .env ] && grep -q "^ENCRYPTION_KEY=$" .env; then
        # Update existing empty key using awk (more reliable than sed for special characters)
        awk -v key="$ENCRYPTION_KEY" '{if ($0 ~ /^ENCRYPTION_KEY=$/) print "ENCRYPTION_KEY='"'"'" key "'"'"'"; else print $0}' .env > .env.tmp && mv .env.tmp .env
        echo "✅ Updated existing ENCRYPTION_KEY in .env file."
    elif [ -f .env ]; then
        # Add new key to existing file
        echo "ENCRYPTION_KEY='$ENCRYPTION_KEY'" >> .env
        echo "✅ Added ENCRYPTION_KEY to .env file."
    else
        # Create new file with key
        echo "ENCRYPTION_KEY='$ENCRYPTION_KEY'" > .env
        echo "✅ Created .env file with ENCRYPTION_KEY."
    fi
    echo "✅ Generated and stored AES-256-GCM encryption key."
fi

# Check for required environment variables
echo "📋 Validating environment variables..."
if ! grep -q "^ANTHROPIC_API_KEY=." .env; then
    echo "⚠️ ANTHROPIC_API_KEY not found or empty in .env file."
    read -p "Please enter your Anthropic API key: " anthropic_key

    # Try to update existing empty ANTHROPIC_API_KEY line, otherwise add new one
    if [ -f .env ] && grep -q "^ANTHROPIC_API_KEY=$" .env; then
        # Update existing empty key using awk (more reliable than sed for special characters)
        awk -v key="$anthropic_key" '{if ($0 ~ /^ANTHROPIC_API_KEY=$/) print "ANTHROPIC_API_KEY='"'"'" key "'"'"'"; else print $0}' .env > .env.tmp && mv .env.tmp .env
        echo "✅ Updated existing ANTHROPIC_API_KEY in .env file."
    elif [ -f .env ]; then
        # Add new key to existing file
        echo "ANTHROPIC_API_KEY='$anthropic_key'" >> .env
        echo "✅ Added ANTHROPIC_API_KEY to .env file."
    else
        # Create new file with key
        echo "ANTHROPIC_API_KEY='$anthropic_key'" > .env
        echo "✅ Created .env file with ANTHROPIC_API_KEY."
    fi
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
echo "   🎉 Setup completed successfully! 🎉"
echo "★═══════════════════════════════════════★"
echo ""

echo "        ┬  ┬┌┐ ┬  ┌─┐┌┐   ┌─┐┬"
echo "        │  │├┴┐│  ├─┤├┴┐  ├─┤│"
echo "        ┴─┘┴└─┘┴─┘┴ ┴└─┘  ┴ ┴┴"

echo ""
echo "Do you want to run the liblab AI builder? (y/n)"
read -p "" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🚀 Starting liblab AI builder..."
    pnpm run dev
else
    echo ""
    echo "You can run it later using:"
    echo ""
    echo "\033[1;32mpnpm run dev\033[0m"
    echo ""
fi
