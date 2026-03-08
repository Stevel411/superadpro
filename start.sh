#!/bin/bash
echo "=== PORT is: $PORT ==="
echo "=== DATABASE_URL starts with: ${DATABASE_URL:0:30} ==="
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
