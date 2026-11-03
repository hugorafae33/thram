import { randomUUID } from "node:crypto";
import { z } from "zod";

export const paymentInput = z.object({
  amount: z.number().int().positive().max(100_000_000),
  currency: z.literal("USD"),
  recipient: z.string().min(3).max(128).regex(/^[a-zA-Z0-9_-]+$/),
  agentId: z.string().min(3).max(128).regex(/^[a-zA-Z0-9_-]+$/),
});
export type PaymentInput = z.infer<typeof paymentInput>;
export type PaymentStatus = "requires_approval" | "approved" | "simulated" | "rejected";
export type Payment = PaymentInput & {
  id: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
};
export type Policy = { agentId: string; maxPerPayment: number; recipients: string[] };

export class ThramSandbox {
  private payments = new Map<string, Payment>();
  private requestKeys = new Map<string, { fingerprint: string; paymentId: string }>();
  private policies = new Map<string, Policy>();

  registerPolicy(policy: Policy) {
    if (!policy.agentId || !Number.isSafeInteger(policy.maxPerPayment) || policy.maxPerPayment <= 0) throw new Error("invalid_policy");
    this.policies.set(policy.agentId, structuredClone(policy));
  }

  create(input: PaymentInput, idempotencyKey: string): Payment {
    const parsed = paymentInput.parse(input);
    const fingerprint = JSON.stringify(parsed);
    if (!idempotencyKey || idempotencyKey.length > 128) throw new Error("invalid_idempotency_key");
    const existing = this.requestKeys.get(idempotencyKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new Error("idempotency_conflict");
      return structuredClone(this.payments.get(existing.paymentId)!);
    }
    const policy = this.policies.get(parsed.agentId);
    if (!policy || parsed.amount > policy.maxPerPayment || !policy.recipients.includes(parsed.recipient)) {
      throw new Error("policy_denied");
    }
    const now = new Date().toISOString();
    const payment: Payment = { ...parsed, id: "pay_" + randomUUID(), status: "requires_approval", createdAt: now, updatedAt: now };
    this.payments.set(payment.id, payment);
    this.requestKeys.set(idempotencyKey, { fingerprint, paymentId: payment.id });
    return structuredClone(payment);
  }

  get(id: string): Payment | undefined {
    const payment = this.payments.get(id);
    return payment && structuredClone(payment);
  }

  approve(id: string): Payment {
    return this.transition(id, "requires_approval", "approved");
  }

  simulate(id: string, result: "simulated" | "rejected"): Payment {
    return this.transition(id, "approved", result);
  }

  private transition(id: string, expected: PaymentStatus, next: PaymentStatus): Payment {
    const payment = this.payments.get(id);
    if (!payment) throw new Error("not_found");
    if (payment.status !== expected) throw new Error("invalid_transition");
    payment.status = next;
    payment.updatedAt = new Date().toISOString();
    return structuredClone(payment);
  }
}
