# Thram developer preview

**Developed by Goyo.** Apache-2.0. Sandbox only. No funds, bank access, or financial credentials.

## Run locally

Requires Node.js 22+ and npm.

```sh
npm install
cp .env.example .env
# Replace both placeholder keys with independent random values
set -a; . ./.env; set +a
npm run dev
```

## Example flow

All requests except health need `Authorization: Bearer $THRAM_SANDBOX_KEY`. Administrative endpoints additionally require `x-thram-admin-key: $THRAM_ADMIN_KEY`.

1. Create a sandbox policy through `POST /v1/admin/policies` with `{ "agentId": "agent_1", "maxPerPayment": 5000, "recipients": ["merchant_1"] }`.
2. Create a payment through `POST /v1/payments` with `Idempotency-Key: unique-1` and `{ "agentId": "agent_1", "amount": 2500, "currency": "USD", "recipient": "merchant_1" }`. Amounts are integer minor units: 2500 = $25.00.
3. Check `GET /v1/payments/:id`: status `requires_approval`.
4. Approve using `POST /v1/admin/payments/:id/approve`.
5. Simulate using `POST /v1/admin/payments/:id/simulate` with `{ "result": "simulated" }` or `{ "result": "rejected" }`.

## Important limitations

- This is an ephemeral, **in-memory** development demo. Restarting erases policies, payments and idempotency keys. Do not deploy publicly as-is.
- The admin key is a developer-only mock of human approval, **not** identity verification or real consent.
- `simulated` means a test outcome only, **never settlement**.
- No payment provider, ACH, FedNow or RTP connectivity exists yet.
- Before any external preview, add durable storage, per-tenant isolation, rate limits, secure key management and a real approval-authentication flow.
