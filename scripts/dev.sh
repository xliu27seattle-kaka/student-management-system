#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Workspace-local tools are optional; normal installations on PATH work as well.
if [[ -d .tools/jdk-21.0.13+9/Contents/Home ]]; then
  export JAVA_HOME="$PWD/.tools/jdk-21.0.13+9/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
fi
if [[ -d .tools/node-v22.23.4-darwin-arm64/bin ]]; then
  export PATH="$PWD/.tools/node-v22.23.4-darwin-arm64/bin:$PATH"
fi
command -v java >/dev/null || { echo 'Java 21 is required.' >&2; exit 1; }
command -v npm >/dev/null || { echo 'Node 22.12+ and npm are required.' >&2; exit 1; }
[[ -d frontend/node_modules ]] || (cd frontend && npm ci)
if [[ -d .tools/m2 ]]; then
  export MAVEN_OPTS="${MAVEN_OPTS:-} -Dmaven.repo.local=$PWD/.tools/m2"
fi
(cd backend && exec ./mvnw -B -ntp spring-boot:run) &
backend_pid=$!
(cd frontend && exec npm start) &
frontend_pid=$!
cleanup() { kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
printf 'Campus: http://localhost:4200\nBackend: http://localhost:8080/api/courses\nPress Ctrl+C to stop both services.\n'
wait
