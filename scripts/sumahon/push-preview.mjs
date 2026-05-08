import { runCommand } from "./utils.mjs";

const safeDirectory = process.cwd();

async function git(args) {
  await runCommand("git", ["-c", `safe.directory=${safeDirectory}`, ...args]);
}

export async function getCurrentBranch() {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    "git",
    ["-c", `safe.directory=${safeDirectory}`, "branch", "--show-current"],
    { encoding: "utf-8", shell: process.platform === "win32" },
  );

  return result.stdout.trim() || "unknown";
}

export async function assertNoTrackedChanges() {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    "git",
    ["-c", `safe.directory=${safeDirectory}`, "status", "--porcelain", "--untracked-files=no"],
    { encoding: "utf-8", shell: process.platform === "win32" },
  );
  const trackedChanges = result.stdout.trim();

  if (trackedChanges) {
    throw new Error(
      [
        "Tracked working tree changes were found before preview branch creation.",
        "Commit or stash intentional script/site changes first, then rerun the CLI.",
        trackedChanges,
      ].join("\n"),
    );
  }
}

export async function createPreviewBranch(branchName) {
  await git(["switch", "-c", branchName]);
}

export async function commitAndPushPreview({ files, message, branchName }) {
  await git(["add", ...files]);
  await git(["commit", "-m", message]);
  await git(["push", "-u", "origin", branchName]);
}
