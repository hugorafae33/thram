/**
 * Thram SDK (developer preview). Sandbox only: no real-money transfers.
 * Amounts are integer USD cents. Use separate credentials for administration.
 */
export type ThramPaymentStatus = "requires_approval" | "approved" | "simulated" | "rejected";
export interface ThramPayment {
  id: string;
  agentId: string;
  recipient: string;
  amount: number;
  currency: "USD";
  status: ThramPaymentStatus;
  createdAt: string;
  updatedAt: string;
}
export interface CreatePayment {
  agentId: string;
  recipient: string;
  amount: number;
  currency: "USD";
}
export class ThramApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, public readonly retryable: boolean) {
    super(code);
    this.name = "ThramApiError";
  }
}
export interface ThramClientOptions {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof globalThis.fetch;
}
export class ThramClient {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  constructor(options: ThramClientOptions) {
    if (!options.baseUrl || !options.apiKey) throw new Error("missing_configuration");
    const url = new URL(options.baseUrl);
    if (url.protocol !== "https:" && !(url.hostname === "localhost" || url.hostname === "127.0.0.1")) {
      throw new Error("https_required");
    }
    this.baseUrl = url.toString().replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetcher = options.fetch ?? globalThis.fetch;
  }

  private async request<T>(path: string, method: "GET" | "POST", body?: unknown, idempotencyKey?: string): Promise<T> {
    const response = await this.fetcher(this.baseUrl + path, {
      method,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Accept": "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const code = typeof payload === "object" && payload !== null && "error" in payload &&
        typeof payload.error === "string" ? payload.error : "request_failed";
      throw new ThramApiError(response.status, code, [429, 502, 503, 504].includes(response.status));
    }
    return payload as T;
  }

  readonly payments = {
    create: (input: CreatePayment, options: { idempotencyKey: string }) => {
      if (!options.idempotencyKey) throw new Error("idempotency_key_required");
      if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error("invalid_amount");
      return this.request<ThramPayment>("/v1/payments", "POST", input, options.idempotencyKey);
    },
    retrieve: (id: string) => {
      if (!/^pay_[0-9a-f-]+$/i.test(id)) throw new Error("invalid_payment_id");
      return this.request<ThramPayment>(`/v1/payments/${encodeURIComponent(id)}`, "GET");
    },
  };
}
