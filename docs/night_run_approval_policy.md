# Night-run approval policy

- A simulation or acceptance run may be scheduled only when the editor explicitly requests that run in the current instruction.
- After a failed run, fix the cause and report it, then wait for a new explicit instruction. Never schedule a retry automatically.
- `config/night-environment.json` is the source of truth. `runApproval.autoRescheduleAfterFailure` must remain `false`.
- Use `scripts/automation/schedule-night-acceptance.ps1 -EditorApproved` only when the current editor instruction authorizes the run.
- Runner cleanup may delete only exact entries in `runnerHygiene.cleanupAllowlist`. Harmless preserved artifacts are classified by `runnerHygiene.harmlessUntrackedAllowlist`; every other untracked path is dangerous and fails closed.
