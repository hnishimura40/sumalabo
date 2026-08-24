# Night Phase 0 audit (2026-08-24)

Phase 0 evaluates only whether the dedicated runner can execute the article pipeline. X-only prerequisites are warnings and cannot stop article generation, merge, deployment, or strict verification.

| Check | Severity | Still true after a successful run? | Decision |
|---|---|---|---|
| `environment_definition` | fatal | Yes. It is versioned configuration. | Keep fatal. |
| `github_token` | fatal | Yes while the scheduled task retains its configured token. | Keep fatal because publishing cannot merge without it. |
| `repository_sha` | fatal | Yes when the runner finishes synchronized to `origin/main`; the final next-run preflight verifies this again. | Keep fatal as runner HEAD = runner `origin/main` only. |
| `runner_dirty` | fatal | Yes. Runtime outputs are ignored and publication changes are committed. | Keep fatal for the dedicated runner only; remove the daytime workspace dependency. |
| `chrome_profile` | warning in Phase 0 / fatal inside X step | The dedicated profile persists, but its process may be closed after a run. | Main contract continues on warning. Before any X clipboard/post action, require an exact `user-data-dir` + `profile-directory` process and fresh `@suma_labo` DOM evidence; mismatch aborts X, preserves pending, and warns. |
| `chrome_extension` | warning | Yes unless the browser installation changes externally. | Keep warning. |
| `native_host` | warning | Yes unless the local installation or registry changes externally. | Keep warning. |
| `x_site_permission` | warning | Yes unless browser permissions change externally. | Keep warning. |
| `file_url_permission` | warning | Yes unless extension permissions change externally. | Keep warning. |
| `x_login_href` | warning | Not necessarily; it is fresh DOM evidence collected again each run. | Keep warning and never block the main contract. |
| `dom_read` | warning | Not necessarily; it is fresh DOM evidence collected again each run. | Keep warning and never block the main contract. |
| `x_ledger_state` | warning | Yes when the external ledger remains readable and writable. | Keep warning; an I/O error skips X only. |

Removed self-contradictory or unrelated dependencies:

- Daytime workspace HEAD = runner HEAD was already removed; `repository_sha` now compares runner HEAD with runner `origin/main`.
- Daytime workspace clean state was removed from `runner_dirty`. Daytime edits are unrelated to the isolated night runner.

The main run finalizer and the 05:30 Watchdog both execute `night-environment-check.mjs --static-only`. A nonzero result sends a next-run warning but never changes the just-completed run's outcome.

The X-local fatal gate uses the dedicated `D:\work\sumalabo-x-chrome` user-data root. It is intentionally separate from the personal Chrome root, so a running Default/Profile 1 window cannot satisfy or capture the X process check.
