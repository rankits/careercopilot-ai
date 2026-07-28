#!/bin/sh
set -e

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo ">>> Running PostgreSQL database migrations..."
  npx prisma migrate deploy
  echo ">>> Migrations completed successfully."
fi

echo ">>> Starting application: $@"
exec "$@"
