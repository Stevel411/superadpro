#!/bin/bash
echo "=== START SCRIPT RUNNING ==="
echo "PORT=$PORT"
echo "DATABASE_URL=${DATABASE_URL:0:40}..."
echo "=== Testing Python import ==="
python3 -c "
import sys
sys.path.insert(0, '/app')
try:
    print('Importing app.main...')
    import app.main
    print('Import OK')
except Exception as e:
    import traceback
    print('IMPORT FAILED:')
    traceback.print_exc()
    sys.exit(1)
"
echo "=== Starting uvicorn ==="
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
