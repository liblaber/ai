#!/bin/bash

# Enable strict error handling
set -euo pipefail

# Shared Docker Compose utility functions
# Source this file in other scripts to use these functions

# Detect which Docker Compose command is available
detect_docker_compose() {
    if docker-compose --version &> /dev/null; then
        echo "docker-compose"
    elif docker compose --version &> /dev/null; then
        echo "docker compose"
    else
        echo "❌ Neither 'docker-compose' nor 'docker compose' is available!" >&2
        return 1
    fi
}

# Get and display the Docker Compose command
get_docker_compose_cmd() {
    local cmd
    if cmd=$(detect_docker_compose); then
        echo "📦 Using Docker Compose command: $cmd" >&2
        echo "$cmd"
    else
        # detect_docker_compose already printed error message
        return 1
    fi
}

# Execute Docker Compose with the detected command
exec_docker_compose() {
    local cmd
    if cmd=$(detect_docker_compose); then
        $cmd "$@"
    else
        # detect_docker_compose already printed error message
        return 1
    fi
}
