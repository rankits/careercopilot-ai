#!/bin/sh
set -e

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo ">>> Generating Prisma client and running PostgreSQL database migrations..."
  npx prisma generate
  npx prisma migrate deploy
  echo ">>> Migrations completed successfully."
fi

echo ">>> Starting application: $@"
exec "$@"
