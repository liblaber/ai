#!/bin/bash

# Enable strict error handling
set -euo pipefail

# Universal Docker Compose wrapper script
# This script detects the available Docker Compose command and forwards all arguments to it

# Check if docker-compose-utils.sh exists and is readable
UTILS_PATH="$(dirname "$0")/docker-compose-utils.sh"
if [ ! -f "$UTILS_PATH" ] || [ ! -r "$UTILS_PATH" ]; then
    echo "❌ Error: Cannot find or read docker-compose-utils.sh at $UTILS_PATH" >&2
    echo "   Please ensure the file exists and is readable." >&2
    exit 1
fi

# Source shared Docker Compose utilities
source "$UTILS_PATH"

# Execute the command with all passed arguments
exec_docker_compose "$@"
