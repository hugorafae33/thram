import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ThramSandbox, paymentInput } from "./core.js";

export const app = new Hono();
export const sandbox = new ThramSandbox();
const demoKey = process.env.THRAM_SANDBOX_KEY;
const adminKey = process.env.THRAM_ADMIN_KEY;

function matches(actual: string | undefined, expected: string | undefined): boolean {
  if (!actual || !expected) return false;
  const a = Buffer.from(actual), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
app.get("/health", c => c.json({ status: "ok", mode: "sandbox", realMoney: false }));
app.use("/v1/*", async (c, next) => {
  if (!demoKey || !adminKey || demoKey === adminKey) return c.json({ error: "sandbox_not_configured" }, 503);
  if (!matches(c.req.header("authorization"), `Bearer ${demoKey}`)) return c.json({ error: "unauthorized" }, 401);
  await next();
});
app.post("/v1/payments", async c => {
  const key = c.req.header("idempotency-key");
  if (!key) return c.json({ error: "idempotency_key_required" }, 400);
  const body = await c.req.json().catch(() => null);
  const parsed = paymentInput.safeParse(body);
  if (!parsed.success) return c.json({ error: "invalid_payment", details: parsed.error.flatten() }, 400);
  try { return c.json(sandbox.create(parsed.data, key), 201); }
  catch (e) {
    const code = (e as Error).message;
    return c.json({ error: code }, code === "idempotency_conflict" ? 409 : 403);
  }
});
app.get("/v1/payments/:id", c => {
  const result = sandbox.get(c.req.param("id"));
  return result ? c.json(result) : c.json({ error: "not_found" }, 404);
});
// Sandbox administration is separate from agent access. Never expose these endpoints as live payment approvals.
app.use("/v1/admin/*", async (c, next) => {
  if (!matches(c.req.header("x-thram-admin-key"), adminKey)) return c.json({ error: "admin_required" }, 403);
  await next();
});
app.post("/v1/admin/policies", async c => {
  const schema = z.object({
    agentId: z.string().min(3),
    maxPerPayment: z.number().int().positive(),
    recipients: z.array(z.string().min(3)).min(1)
  });
  const data = schema.safeParse(await c.req.json().catch(() => null));
  if (!data.success) return c.json({ error: "invalid_policy" }, 400);
  sandbox.registerPolicy(data.data);
  return c.json({ ok: true });
});
app.post("/v1/admin/payments/:id/approve", c => {
  try { return c.json(sandbox.approve(c.req.param("id"))); }
  catch (e) { return c.json({ error: (e as Error).message }, 409); }
});
app.post("/v1/admin/payments/:id/simulate", async c => {
  const result = z.object({ result: z.enum(["simulated", "rejected"]) }).safeParse(await c.req.json().catch(() => null));
  if (!result.success) return c.json({ error: "invalid_result" }, 400);
  try { return c.json(sandbox.simulate(c.req.param("id"), result.data.result)); }
  catch (e) { return c.json({ error: (e as Error).message }, 409); }
});
if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT || 8787);
  serve({ fetch: app.fetch, port });
  console.log(`Thram sandbox listening on ${port} (NO REAL MONEY)`);
}
