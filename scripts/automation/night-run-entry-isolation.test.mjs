import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isolatedShellOptions, runIsolatedShell, runPowerShellIsolated } from "./night-run-entry.mjs";

test("night wrapper child uses a separate Windows process group", () => {
  const options = isolatedShellOptions({ cwd: "C:\\runner", env: { TEST: "1" } });
  assert.equal(options.windowsHide, true);
  assert.deepEqual(options.stdio, ["ignore", "pipe", "pipe"]);
  assert.equal(options.detached, process.platform === "win32");
  assert.equal(options.cwd, "C:\\runner");
  assert.deepEqual(options.env, { TEST: "1" });
});

test("isolated wrapper waits for and returns the real child exit code", async () => {
  const result = await runIsolatedShell(process.execPath, ["-e", "process.exit(7)"], {
    cwd: process.cwd(),
    env: process.env,
  });
  assert.equal(result.status, 7);
  assert.equal(result.signal, null);
});

test("isolated Windows command shell returns its script exit code", { skip: process.platform !== "win32" }, async () => {
  const result = await runIsolatedShell("cmd.exe", [
    "/d", "/c", "exit", "9",
  ], { cwd: process.cwd(), env: process.env });
  assert.equal(result.status, 9);
});

test("isolated cmd wrapper preserves PowerShell exit code", { skip: process.platform !== "win32" }, async () => {
  const result = await runPowerShellIsolated(
    fileURLToPath(new URL("./fixtures/exit-11.ps1", import.meta.url)),
    [],
    { cwd: process.cwd(), env: process.env },
  );
  assert.equal(result.status, 11);
});
