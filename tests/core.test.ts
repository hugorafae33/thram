import { describe, it, expect } from "vitest";
import { ThramSandbox } from "../src/core.js";

function setup() {
 const core = new ThramSandbox();
 core.registerPolicy({ agentId: "agent_1", maxPerPayment: 5000, recipients: ["merchant_1"] });
 return core;
}
const request = { agentId: "agent_1", amount: 2500, currency: "USD" as const, recipient: "merchant_1" };
describe("Thram sandbox", () => {
 it("requires explicit approval before simulated execution", () => {
  const core = setup();
  const payment = core.create(request, "req-1");
  expect(payment.status).toBe("requires_approval");
  expect(() => core.simulate(payment.id, "simulated")).toThrow("invalid_transition");
  core.approve(payment.id);
  expect(core.simulate(payment.id, "simulated").status).toBe("simulated");
 });
 it("deduplicates retries and rejects changed requests", () => {
  const core = setup();
  const first = core.create(request, "req-1");
  expect(core.create(request, "req-1").id).toBe(first.id);
  expect(() => core.create({ ...request, amount: 4000 }, "req-1")).toThrow("idempotency_conflict");
 });
 it("denies unauthorized recipients and budgets", () => {
  const core = setup();
  expect(() => core.create({ ...request, amount: 6000 }, "req-2")).toThrow("policy_denied");
  expect(() => core.create({ ...request, recipient: "merchant_2" }, "req-3")).toThrow("policy_denied");
 });
 it("refuses repeat approval and simulation", () => {
  const core = setup();
  const payment = core.create(request, "req-4");
  core.approve(payment.id);
  expect(() => core.approve(payment.id)).toThrow("invalid_transition");
  core.simulate(payment.id, "rejected");
  expect(() => core.simulate(payment.id, "simulated")).toThrow("invalid_transition");
 });
});
