# Campus frontend

See the [repository README](../README.md) for setup, architecture, API, and verification instructions.

Prerequisite: install Node.js **22.22.3+ within 22.x**, with npm/npx, using the [standard setup instructions](../docs/DEVELOPMENT.md#run-locally). Check `node --version`, `npm --version`, and `npx --version` in a new terminal. Run the commands below from `frontend/`.

```bash
npm ci
npm start        # localhost:4200; proxies /api to localhost:8080
npm test         # Vitest unit tests
npm run build    # Production output in dist/frontend/browser
npm run typecheck:e2e # Type-check Playwright source
npm run test:e2e:docker # Use the isolated Docker verification stack described in ../docs/DOCKER_VERIFICATION.md
npm run test:e2e # Requires packaged backend JAR; isolated ports 4201/8081
```
