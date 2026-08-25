# Night Phase 0 audit (2026-08-24)

Phase 0 evaluates only whether the dedicated runner can execute the article pipeline. X-only prerequisites are warnings and cannot stop article generation, merge, deployment, or strict verification.

| Check | Severity | Still true after a successful run? | Decision |
|---|---|---|---|
| `environment_definition` | fatal | Yes. It is versioned configuration. | Keep fatal. |
| `github_token` | fatal | Yes while the scheduled task retains its configured token. | Keep fatal because publishing cannot merge without it. |
| `repository_sha` | fatal | Yes when the runner finishes synchronized to `origin/main`; the final next-run preflight verifies this again. | Keep fatal as runner HEAD = runner `origin/main` only. |
| `runner_dirty` | fatal | Yes. Runtime outputs are ignored and publication changes are committed. | Keep fatal for the dedicated runner only; remove the daytime workspace dependency. |
| `chrome_profile` | not run in Phase 0 / fatal inside X step | The dedicated profile persists, but its process may be closed after a run. | Before any X clipboard/post action, require an exact `user-data-dir` + `profile-directory` process and fresh `@suma_labo` DOM evidence; mismatch aborts X, preserves pending, and warns. |
| `chrome_extension` | X-step local | Yes unless the browser installation changes externally. | Never evaluate on the publishing path. |
| `native_host` | X-step local | Yes unless the local installation or registry changes externally. | Never evaluate on the publishing path. |
| `x_site_permission` | X-step local | Yes unless browser permissions change externally. | Never evaluate on the publishing path. |
| `file_url_permission` | X-step local | Yes unless extension permissions change externally. | Never evaluate on the publishing path. |
| `x_login_href` | fatal inside X step | Not necessarily; it is fresh DOM evidence collected for an X attempt. | A mismatch stops only X and never blocks the main contract. |
| `dom_read` | fatal inside X step | Not necessarily; it is fresh DOM evidence collected for an X attempt. | A failure stops only X and never blocks the main contract. |
| `x_ledger_state` | X-step local | Yes when the external ledger remains readable and writable. | An I/O error skips X only. |

Removed self-contradictory or unrelated dependencies:

- Daytime workspace HEAD = runner HEAD was already removed; `repository_sha` now compares runner HEAD with runner `origin/main`.
- Daytime workspace clean state was removed from `runner_dirty`. Daytime edits are unrelated to the isolated night runner.

The publishing Phase 0, main run finalizer, and 05:30 Watchdog execute `night-environment-check.mjs --article-only`. This scope checks only `environment_definition`, `github_token`, `repository_sha`, and `runner_dirty`; it never starts or inspects Chrome, reads X DOM state, or touches the X ledger. A nonzero finalizer/Watchdog result sends a next-run warning but never changes the just-completed run's outcome.

Chrome profile, extension, permissions, X login DOM, and ledger checks are X-step-local. They run only after the primary publishing contract has completed, inside `night-x-post-step.ps1` (via `night-x-profile-check.ps1`), and can fail only the secondary X contract.

The X-local fatal gate uses the dedicated `D:\work\sumalabo-x-chrome` user-data root. It is intentionally separate from the personal Chrome root, so a running Default/Profile 1 window cannot satisfy or capture the X process check.
