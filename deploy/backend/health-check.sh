#!/usr/bin/env bash
set -Eeuo pipefail

# Verifies localhost health endpoint of the backend application on port 5001.
# Confirms HTTP 200 and JSON response containing "status":"ok".
# RabbitMQ is included in /health when ENABLE_EMAIL_WORKER=true or
# HEALTH_CHECK_RABBITMQ=true.

HEALTH_URL="http://127.0.0.1:5001/health"
MAX_ATTEMPTS=24
SLEEP_SECONDS=5

echo ">>> Starting health check against $HEALTH_URL (timeout ~2 minutes)..."

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  echo ">>> Attempt $attempt/$MAX_ATTEMPTS: Checking localhost health endpoint..."

  RESPONSE="$(curl -s -w "\n%{http_code}" "$HEALTH_URL" 2>/dev/null || echo -e "\n000")"
  HTTP_CODE="$(echo "$RESPONSE" | tail -n 1)"
  BODY="$(echo "$RESPONSE" | sed '$d')"

  if [[ "$HTTP_CODE" == "200" ]]; then
    if echo "$BODY" | grep -E -q '"status"\s*:\s*"ok"'; then
      echo ">>> Health check passed! Response HTTP $HTTP_CODE: $BODY"
      exit 0
    else
      echo ">>> Warning: HTTP 200 returned but status not ok in response body: $BODY"
    fi
  else
    echo ">>> Warning: Health endpoint returned HTTP $HTTP_CODE"
  fi

  if [[ "$attempt" -lt "$MAX_ATTEMPTS" ]]; then
    sleep "$SLEEP_SECONDS"
  fi
done

echo "Error: Health check failed after $MAX_ATTEMPTS attempts (~2 minutes)." >&2
exit 1
