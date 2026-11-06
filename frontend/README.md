# Campus frontend

See the [repository README](../README.md) for setup, architecture, API, and verification instructions.

```bash
npm ci
npm start        # localhost:4200; proxies /api to localhost:8080
npm test         # Vitest unit tests
npm run build    # Production output in dist/frontend/browser
npm run typecheck:e2e # Type-check Playwright source
npm run test:e2e:docker # Use the isolated Docker verification stack described in ../docs/DOCKER_VERIFICATION.md
npm run test:e2e # Requires packaged backend JAR; isolated ports 4201/8081
```
