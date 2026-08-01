#!/bin/sh
set -e

# Fix ownership for bind-mounted / named volumes before dropping privileges.
# Prisma generate writes into node_modules/.prisma and @prisma.
if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/storage/resumes
  chown -R node:node /app/storage
  if [ -d /app/node_modules ]; then
    chown -R node:node /app/node_modules/.prisma /app/node_modules/@prisma 2>/dev/null || true
  fi
fi

as_node() {
  if [ "$(id -u)" = "0" ]; then
    su-exec node "$@"
  else
    "$@"
  fi
}

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo ">>> Generating Prisma client and running PostgreSQL database migrations..."
  as_node npx prisma generate
  as_node npx prisma migrate deploy
  echo ">>> Migrations completed successfully."
fi

echo ">>> Starting application: $*"
if [ "$(id -u)" = "0" ]; then
  exec su-exec node "$@"
fi

exec "$@"
