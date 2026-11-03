/**
 * Sandbox only: no funds move.
 * Run the Thram API separately and create an agent policy with the admin API.
 * Set THRAM_SANDBOX_KEY in your environment.
 */
import { ThramClient } from "../src/sdk.js";
import { randomUUID } from "node:crypto";

const client = new ThramClient({
  baseUrl: process.env.THRAM_BASE_URL ?? "http://localhost:8787",
  apiKey: process.env.THRAM_SANDBOX_KEY ?? "",
});

const payment = await client.payments.create(
  { amount: 2500, currency: "USD", recipient: "merchant_1", agentId: "agent_1" },
  { idempotencyKey: randomUUID() }
);
console.log({ id: payment.id, status: payment.status, isRealMoney: false });
