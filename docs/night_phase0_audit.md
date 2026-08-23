# Night Phase 0 audit (2026-08-24)

Phase 0 evaluates only whether the dedicated runner can execute the article pipeline. X-only prerequisites are warnings and cannot stop article generation, merge, deployment, or strict verification.

| Check | Severity | Still true after a successful run? | Decision |
|---|---|---|---|
| `environment_definition` | fatal | Yes. It is versioned configuration. | Keep fatal. |
| `github_token` | fatal | Yes while the scheduled task retains its configured token. | Keep fatal because publishing cannot merge without it. |
| `repository_sha` | fatal | Yes when the runner finishes synchronized to `origin/main`; the final next-run preflight verifies this again. | Keep fatal as runner HEAD = runner `origin/main` only. |
| `runner_dirty` | fatal | Yes. Runtime outputs are ignored and publication changes are committed. | Keep fatal for the dedicated runner only; remove the daytime workspace dependency. |
| `chrome_profile` | warning | The profile persists, but a Chrome process may be closed after a run. | Keep warning. |
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
