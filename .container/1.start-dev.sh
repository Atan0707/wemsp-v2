#!/bin/bash

# Navigate to the .container directory
cd "$(dirname "$0")"

# Start the development containers
echo "Starting development containers..."
docker compose -f docker-compose.dev.yml up

# If you want to run in detached mode (background), use:
# docker compose -f docker-compose.dev.yml up -d
