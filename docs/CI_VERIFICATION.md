# GitHub Actions verification

## Observed hosted results

The repository is public and commit `52e81d9` has been published. Its [Actions run](https://github.com/xliu27seattle-kaka/student-management-system/actions/runs/42176228485) failed in both jobs at `npx playwright install --with-deps chromium`.

- `verify`: backend verification, frontend unit tests, production build, and E2E TypeScript checks passed. Browser tests did not start.
- `docker-smoke`: Compose validation, image builds, container readiness, the seeded-data HTTP check, and dependency installation passed. Browser and persistence checks did not start.
- The previous run at `6c9178c` also failed at browser installation; its earlier, smaller Docker smoke job passed.

These results were read from the public GitHub Actions jobs and check annotations. Downloading full job logs requires repository authorization, so the exact browser-install error has not been confirmed.

## Environment correction

GitHub's runner annotation reports the [migration of `ubuntu-latest` to Ubuntu 26.04](https://github.com/actions/runner-images/issues/14748). This project pins Playwright 1.56.1, whose installed platform resolver supports Ubuntu 24.04 and treats Ubuntu 26.04 as unsupported. Runner OS drift is therefore a compatibility concern consistent with the failing step, rather than a confirmed diagnosis of its detailed error.

Both jobs now explicitly use `ubuntu-24.04`. The GitHub-maintained actions have also been updated to their current Node 24 runtime majors: checkout v7, setup-node v7, setup-java v6, and upload-artifact v7. These action runtimes are separate from the application's Node 22 and Java 21 versions. Missing browser artifacts are ignored when installation fails before tests create any files.

The workflow performs continuous integration only: it builds and tests the submission on pushes and pull requests. It does not deploy the application.

## Validation of the correction

In an isolated local Ubuntu 24.04 ARM64 container with Node 22 and Java 21, `npm ci` and `npx playwright install --with-deps chromium` succeeded. `npm run typecheck:e2e` and all **11 E2E tests passed** (36.7 seconds). The validation container exposes no host ports and uses an in-memory test database, preserving the normal running application's data.

As a diagnostic simulation in that container, setting `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu26.04-arm64` caused the exact installation command to exit 1 with `Playwright does not support chromium on ubuntu26.04-arm64`. This confirms the pinned browser tooling cannot install for that platform; it is not a reproduction of GitHub's full runner image or a substitute for its inaccessible detailed logs.

A new successful hosted run is still required before declaring GitHub Actions green. Local ARM64 container results do not certify the hosted x64 runner.
