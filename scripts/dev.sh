#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Use the caller's standard tool installation; do not override JAVA_HOME or PATH.
command -v java >/dev/null || { echo 'JDK 21 is required. See docs/DEVELOPMENT.md.' >&2; exit 1; }
command -v node >/dev/null || { echo 'Node.js 22.22.3+ (22.x) is required. See docs/DEVELOPMENT.md.' >&2; exit 1; }
command -v npm >/dev/null || { echo 'npm is required and is included with Node.js. See docs/DEVELOPMENT.md.' >&2; exit 1; }
[[ -d frontend/node_modules ]] || (cd frontend && npm ci)
(cd backend && exec ./mvnw -B -ntp spring-boot:run) &
backend_pid=$!
(cd frontend && exec npm start) &
frontend_pid=$!
cleanup() { kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
printf 'Campus: http://localhost:4200\nBackend: http://localhost:8080/api/courses\nPress Ctrl+C to stop both services.\n'
wait
