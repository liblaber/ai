#!/bin/bash

# Universal Docker Compose wrapper script
# This script detects the available Docker Compose command and forwards all arguments to it

# Detect which Docker Compose command is available
detect_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    elif docker compose version &> /dev/null; then
        echo "docker compose"
    else
        echo "❌ Neither 'docker-compose' nor 'docker compose' is available!" >&2
        exit 1
    fi
}

# Get the Docker Compose command
DOCKER_COMPOSE_CMD=$(detect_docker_compose)

# Execute the command with all passed arguments
$DOCKER_COMPOSE_CMD "$@"
