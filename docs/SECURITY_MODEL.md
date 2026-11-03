# Thram security model (sandbox developer preview)

**Developed by Goyo. Thram does not currently process or custody money.**

## Trust boundaries
- The API key authenticates a sandbox caller, **not** a human owner or bank account holder.
- A distinct admin key controls policies and demo approvals. This is **not** proof of real consent.
- Agents cannot directly approve or simulate transactions through the public payment endpoints.
- A created payment is a request, not a charge; a 'simulated' outcome is never financial settlement.

## Explicit limitations and production blockers
- In-memory storage loses idempotency keys on restart. Never use for live transfers.
- Shared sandbox keys mean no tenant isolation, owner identity, or individualized revocation.
- No persistence, transactional concurrency controls, audit sink, rate limiting, or replay protection for externally signed approvals.
- No banking connectors, KYC/KYB, sanctions controls, consent verification, or reconciliation.
- Production requires a threat model, durable atomic state changes, per-tenant security boundaries, managed secrets, webhook signature verification, monitoring, incident response and independent assessment.

## Threats to test
- Reuse one idempotency key with conflicting payloads.
- Attempt to approve without the admin key.
- Attempt to skip approval or execute the same request twice.
- Attempt to exceed an agent budget or pay an unknown recipient.
- Retry after simulated network timeout and service restart.
- Concurrent double-submission and privilege escalation (must be addressed before public preview).

Do not represent this demo as bank-grade, audited, or payment-ready.
