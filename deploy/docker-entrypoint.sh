#!/bin/sh
set -e

# Wait for Postgres to be ready
echo "Waiting for PostgreSQL at $POSTGRES_HOST:$POSTGRES_PORT..."
until nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "PostgreSQL is up - executing migrations"

# Navigate to backend and run migrations
cd /app/backend
npm run migrate:up

# Start the application
echo "Starting InsForge..."
cd /app
npm start
