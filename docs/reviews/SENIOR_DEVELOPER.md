# Senior Software Developer review

Reviewer: independent agent `developer_review`.
Date: November 5, 2026.
Scope: Java/Angular correctness, CRUD/enrollment behavior, asynchronous state, validation, errors, and meaningful tests for the agreed 48-hour take-home.

This records the review actually returned in the conversation. It is not a newly performed review or a human employee's assessment. Initial review covered `58f33f6`; the re-reviewed corrections were subsequently committed in `6c9178c`.

## Initial vote: approve with minor comments

The reviewer found no must-fix correctness defect. It independently executed:

- **19 backend tests: passed.** Its initial sandbox run blocked Mockito attachment; execution with the required permissions passed.
- **13 frontend unit tests: passed.**
- **10 Playwright tests: passed**, using the isolated local test servers.

It also investigated a suspected pending-save navigation race in a real browser. That suspicion was **disproved**: navigation was blocked while the create response was pending and completed correctly afterward.

It requested two improvements:

1. **Avoid repeated enrollment-count queries.** Course and roster DTO mapping issued a count per mapped item. Batch course counts and reuse the shared course view for a roster.
2. **Keep pending-save behavior under regression coverage.** Delay a create response, attempt tab/directory navigation, confirm the editor remains active, then release the response and verify the resulting record and controls.

## Corrections inspected

- Course and student-course lists use a grouped count projection; rosters share one course view.
- New backend tests cover zero/multiple enrollments, withdrawal updates, and query behavior.
- A Playwright case holds an actual create response, checks both navigation attempts, then checks the record URL, form, and controls after release.

## Final reviewer response

> Final vote: approve.

The reviewer confirmed that both comments were resolved and reported no unresolved developer-review conditions for the agreed scope.

It reviewed the corrected source and fresh logs showing **22 backend**, **13 frontend**, and **11 end-to-end** tests passed. These final executions were performed by the implementing agent; the developer's independently executed initial suite is distinguished above.

## Evidence limits and later Docker work

The initial browser suite targeted locally launched Angular/Spring servers, not the later production Docker stack. The reviewer did not perform the subsequent Docker-specific evidence review; that was performed by the CTO agent.

Actual Docker builds, Docker-targeted browser tests, and persistence/reset checks later passed; see [Docker verification](../DOCKER_VERIFICATION.md). GitHub publication and hosted CI remain separate delivery checks.

See the [panel report](../PANEL_REVIEW.md) for all votes.
