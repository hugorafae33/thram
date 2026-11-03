import { describe, expect, it, vi } from "vitest";
import { ThramClient, ThramApiError } from "../src/sdk.js";

describe("ThramClient", () => {
 it("rejects non-local plaintext connections", () => {
  expect(() => new ThramClient({baseUrl: "http://example.org", apiKey: "test"})).toThrow("https_required");
 });
 it("requires idempotency keys before network calls", () => {
  const fetchMock = vi.fn();
  const client = new ThramClient({baseUrl:"http://localhost:8787",apiKey:"test",fetch:fetchMock as unknown as typeof fetch});
  expect(() => client.payments.create({agentId:"agent_1", recipient:"merchant_1", amount:100, currency:"USD"},{idempotencyKey:""})).toThrow("idempotency_key_required");
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it("sends authenticated creation and idempotency header", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({id:"pay_123", status:"requires_approval"}), {status:201,headers:{"Content-Type":"application/json"}}));
  const client = new ThramClient({baseUrl:"http://localhost:8787",apiKey:"sandbox_key",fetch:fetchMock as unknown as typeof fetch});
  const result = await client.payments.create({agentId:"agent_1", recipient:"merchant_1", amount:100, currency:"USD"},{idempotencyKey:"req_1"});
  expect(result.status).toBe("requires_approval");
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
  expect((init.headers as Record<string,string>)["Idempotency-Key"]).toBe("req_1");
  expect((init.headers as Record<string,string>)["Authorization"]).toBe("Bearer sandbox_key");
 });
 it("returns structured non-retryable policy errors", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({error:"policy_denied"}), {status:403}));
  const client = new ThramClient({baseUrl:"http://localhost:8787",apiKey:"test",fetch:fetchMock as unknown as typeof fetch});
  await expect(client.payments.retrieve("pay_123")).rejects.toMatchObject({status:403,code:"policy_denied",retryable:false});
 });
});
