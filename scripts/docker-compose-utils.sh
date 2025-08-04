#!/bin/bash

# Shared Docker Compose utility functions
# Source this file in other scripts to use these functions

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

# Get and display the Docker Compose command
get_docker_compose_cmd() {
    local cmd=$(detect_docker_compose)
    echo "📦 Using Docker Compose command: $cmd" >&2
    echo "$cmd"
}

# Execute Docker Compose with the detected command
exec_docker_compose() {
    local cmd=$(detect_docker_compose)
    $cmd "$@"
}
