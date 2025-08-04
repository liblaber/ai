#!/bin/bash

# Universal Docker Compose wrapper script
# This script detects the available Docker Compose command and forwards all arguments to it

# Source shared Docker Compose utilities
source "$(dirname "$0")/docker-compose-utils.sh"

# Execute the command with all passed arguments
exec_docker_compose "$@"
