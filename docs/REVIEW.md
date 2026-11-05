# Review and verification

This is a **self-review using four hiring-panel perspectives**, not independent human reviews or an actual hiring decision. Votes assess the agreed 48-hour take-home scope.

| Perspective               | Assessment                                                                                                                                                                                                                                                                   | Simulated vote |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| CTO                       | The agreed workflow is complete, with a small operational footprint, documented setup, and optional Docker packaging. Weather remains an independent enhancement. Scope stays appropriate for a take-home.                                                                   | Strong pass    |
| Technical recruiter       | The README maps the implementation to the assignment, explains both startup paths, provides screenshots, and makes verification commands easy to find. The project is in the requested public repository.                                                                    | Strong pass    |
| Senior software developer | CRUD, validation, error feedback, work-tab drafts, confirmation dialogs, and both enrollment directions are implemented. Backend business rules are covered with meaningful unit and integration tests; browser tests exercise the actual application.                       | Strong pass    |
| Senior architect          | Three tables express the many-to-many relationship without duplicating it. Transactions, consistent row-lock order, uniqueness constraints, migrations, and DTO boundaries address the important failure modes. The architecture avoids extra services and state frameworks. | Strong pass    |

## Findings addressed

- Course capacity must be enforced under concurrent enrollment, not only by disabling frontend buttons: implemented a course row lock and a simultaneous last-seat test.
- Deleted seed courses must not return after restart: moved seeding into a versioned Flyway migration and tested re-running migrations after deletion.
- Closing a dirty tab could trigger a second navigation confirmation: mark the discarded form pristine before navigating away.
- Work-tab URLs must have separate route segments: corrected link construction and verified draft preservation through real tab switching.
- Narrow tables obscured actions on phones: use a card layout at mobile widths and check horizontal page overflow.
- An early deletion assertion raced the HTTP response: browser tests now wait for the success message before checking the resulting 404.
- Preserve standard Spring HTTP error codes rather than mapping all framework exceptions to 500.
- Automatic browser location must follow the user's selected privacy behavior: only weather lookup; show “Current location”; no reverse geocoder.

## Executed verification

Verified locally on November 5, 2026 using Java 21.0.13 and Node 22.23.4.

| Check                                      | Result                                                           |
| ------------------------------------------ | ---------------------------------------------------------------- |
| Maven `verify`                             | **18 tests passed**, executable JAR packaged                     |
| Frontend `npm test`                        | **8 tests passed**                                               |
| Angular production build                   | **Passed**, approximately 124 kB estimated initial transfer      |
| Playwright / Chromium                      | **7 tests passed** against real Spring and in-memory H2          |
| Desktop / 390 px mobile browser inspection | **Passed**, no runtime page errors or horizontal page overflow   |
| Live `/api/weather` with DC defaults       | **HTTP 200**, current conditions and America/New_York local date |
| Live `/api/weather/cities?name=Seattle`    | **HTTP 200**, selectable city results                            |
| Local frontend and course directory        | **HTTP 200**; ten seeded courses                                 |
| GitHub repository visibility               | Public repository confirmed                                      |

Backend coverage includes validation, missing records, normalized unique emails/codes, paging/search, both enrollment query directions, deletion on either side without deleting the other entity, withdrawal, capacity reduction rollback, duplicate enrollment, simultaneous last-seat enrollment, one-time course seeding, and weather mapping/outages/malformed responses. External HTTP is mocked in backend weather tests.

Browser coverage includes duplicate-email and capacity-conflict messages from the backend, create/update/delete for both entities, field validation, enrollment and withdrawal, independent work-tab drafts, cancel/discard confirmation, delete cancellation, city selection, successful geolocation, denied geolocation, weather outage isolation, mobile layout, paging, sorting, and searching. Browser weather responses are stubbed for deterministic tests; live weather was checked separately.

## Remaining verification limits and tradeoffs

- Dockerfiles and Compose configuration are supplied, but Docker is unavailable in the development environment, so container builds were not executed.
- The GitHub Actions workflow is supplied; a successful local run does not establish the status of a future hosted CI run.
- Mobile layout was checked in Chromium emulation, not on physical iOS/Android devices. Accessibility includes labels, focus states, keyboard-accessible dialogs, and a skip link; no formal accessibility audit is claimed.
- H2, in-memory form drafts, last-write-wins edits, per-course count queries, and unpaginated rosters are intentional size limits for this assignment. A larger deployment would revisit these choices.
