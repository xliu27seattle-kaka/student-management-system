# Docker verification

Executed locally on November 5, 2026 using Docker Engine **29.9.2**, Docker Compose **5.6.1**, and Linux **ARM64** containers on Docker Desktop. The backend runtime reports Temurin **Java 21.0.13+9**. The application was built from source and exercised through the production Nginx frontend, Spring backend, and file-backed H2 database.

## Results

| Check                                                 | Result                                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Backend image build                                   | **Passed**, including **22 backend tests** inside the Linux build container                         |
| Frontend image build                                  | **Passed**, Angular production build served by Nginx                                                |
| Compose startup and health checks                     | **Passed**, both services healthy on localhost:4200 / localhost:8080                                |
| Playwright against Docker                             | **11 / 11 passed**, real Nginx/Spring/H2 requests                                                   |
| Actual weather / city lookup through Nginx            | **HTTP 200** for DC weather and Seattle search                                                      |
| Container removal and recreation with retained volume | **Passed**, student, course, enrollment, and IDs retained                                           |
| Deleted seed course after recreation                  | **Passed**, deletion persisted; Flyway did not restore it                                           |
| Intentional removal of disposable volume              | **Passed**, volume absent after `down -v`                                                           |
| New volume initialization                             | **Passed**, only the ten seed courses returned, each capacity 20; no test students or custom course |

The browser suite covers student/course CRUD, form and conflict feedback, enrollment/withdrawal, duplicate/full-course rejection, work-tab drafts, confirmation dialogs, paging/search/sorting, invalid record URLs, pending-save navigation, weather failure isolation, browser location, and mobile layout. Browser weather responses are stubbed for repeatability; actual external weather calls were checked separately through the Docker stack.

The persistence test creates a student, a custom course, and an enrollment, and deletes one seed course. It executes `down` and `up`, checks retained records and the seed deletion, then executes `down -v` and `up` to verify clean initialization.

The first persistence-driver attempt reused an HTTP socket after its container had been replaced and received `ECONNRESET`. A separate fresh-client request confirmed the retained student was healthy. The driver was corrected to close connections between requests, and the entire recreation/reset sequence passed from a fresh verification volume. This was a test-driver connection-lifecycle correction; no application change was required.

## Reproduce

Docker Desktop / Engine must be running. The browser tests also need Node 22.22.3+ (22.x) locally. They use a **disposable** project called `student-management-verify`; the persistence script deliberately removes that project's data volume. Do not substitute an existing application volume.

Stop the normal application first to free ports 4200 and 8080; `down` retains its data:

```bash
# From the repository root
docker compose down
docker compose -p student-management-verify up --build -d --wait

cd frontend
npm ci
npx playwright install chromium
npm run typecheck:e2e
npm run test:e2e:docker
cd ..

node scripts/verify-docker-persistence.mjs

# Remove only the disposable verification resources
docker compose -p student-management-verify down -v

# Return to the normal application
docker compose up --build -d --wait
```

The persistence driver verifies that the named verification frontend owns localhost:4200 and starts with ten unmodified seed courses and no students before creating or deleting records. It never removes the normal application's volume. The local non-Docker H2 files under `backend/data/` are also separate and were preserved.

`npm run test:e2e:docker` does not start local Java or Angular development servers. Chromium runs on the host and connects to the containers. Failure screenshots/traces are stored under `frontend/test-results/docker/`.

The GitHub Actions Docker job now repeats the build, Docker-targeted browser suite, and persistence/reset script. **No hosted Actions result is claimed**; the passing results above are from actual local Docker execution. GitHub publication remains a separate authentication issue.

## CTO evidence re-review

The independent CTO review agent inspected the build/browser/persistence logs, driver, Docker Playwright configuration, and CI/documentation changes. Its final decision was **Approve: the former local Docker evidence gap is closed**, with no blocking defect and unconditional implementation/local-runtime approval for the agreed scope. This was evidence and source review, not a claim that the reviewer personally executed Docker. Publication and hosted CI remain separate outstanding delivery checks.
