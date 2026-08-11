import assert from "node:assert/strict";
import test from "node:test";
import { isolatedShellOptions } from "./night-run-entry.mjs";

test("night wrapper child uses a separate Windows process group", () => {
  const options = isolatedShellOptions({ cwd: "C:\\runner", env: { TEST: "1" } });
  assert.equal(options.windowsHide, true);
  assert.deepEqual(options.stdio, ["ignore", "pipe", "pipe"]);
  assert.equal(options.detached, process.platform === "win32");
  assert.equal(options.cwd, "C:\\runner");
  assert.deepEqual(options.env, { TEST: "1" });
});
