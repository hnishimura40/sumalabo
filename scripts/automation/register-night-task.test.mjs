import assert from "node:assert/strict";
import test from "node:test";
import { DRIVER_ENTRY, validateNightTaskXml } from "./register-night-task.mjs";

const hardenedXml = `
<Task>
  <Settings>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <IdleSettings><StopOnIdleEnd>false</StopOnIdleEnd></IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <ExecutionTimeLimit>PT12H</ExecutionTimeLimit>
  </Settings>
  <Actions><Exec><Command>cmd.exe</Command><Arguments>/d /c ${DRIVER_ENTRY}</Arguments></Exec></Actions>
</Task>`;

test("production task XML carries the unattended stop protections", () => {
  assert.deepEqual(validateNightTaskXml(hardenedXml).problems, []);
});

test("legacy battery and idle stop settings are rejected", () => {
  const legacyXml = hardenedXml
    .replace("<DisallowStartIfOnBatteries>false", "<DisallowStartIfOnBatteries>true")
    .replace("<StopIfGoingOnBatteries>false", "<StopIfGoingOnBatteries>true")
    .replace("<StopOnIdleEnd>false", "<StopOnIdleEnd>true");
  assert.deepEqual(validateNightTaskXml(legacyXml).problems, [
    "battery_start_disallowed",
    "battery_stop_enabled",
    "idle_stop_enabled",
  ]);
});
