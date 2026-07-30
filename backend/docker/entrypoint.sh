#!/bin/sh
set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/storage/resumes
  chown -R node:node /app/storage
fi

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo ">>> Generating Prisma client and running PostgreSQL database migrations..."
  npx prisma generate
  npx prisma migrate deploy
  echo ">>> Migrations completed successfully."
fi

echo ">>> Starting application: $@"
if [ "$(id -u)" = "0" ]; then
  exec su-exec node "$@"
fi

exec "$@"
