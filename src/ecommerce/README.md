# E-commerce Customer Enquiry Workflow V1

## Goal
Create a helpful customer-support draft, require human approval, and keep a verifiable record. V1 does not send messages or connect to a live store.

## Workflow
1. Receive a customer message and known store/product/policy context.
2. Create a response draft (an optional injected `generateDraft` function can call an AI provider).
3. Flag sensitive requests such as refunds, cancellations, legal concerns, medical issues, or payment credentials for extra review.
4. Require a human to approve an explicitly reviewed draft.
5. Keep the status as `APPROVED_NOT_SENT` until a future authorized delivery adapter returns a verified provider message ID.
6. Record the provider evidence before allowing `DELIVERY_VERIFIED`.

## Local test
```powershell
npm test
```

The test suite now includes `src/ecommerce/customer-enquiry-v1-test.js`.

## Current limitations
- The default draft is a safe fallback template, not a live AI response.
- No Shopify, email, WhatsApp, or other delivery provider is connected.
- The delivery verification function tests the evidence contract; it does not contact a provider.
- The record is in-memory and is not persisted to a database.
- Human approval here is a code-level boundary, not yet authenticated user identity or a production approval UI.

## Next acceptance gates
1. Run the existing full test suite and fix any failures.
2. Add a real AI provider behind the injected interface, with credentials in environment variables and a mocked unit test.
3. Add durable audit storage and authenticated approval.
4. Integrate one delivery provider in test mode; verify the returned provider message ID.
5. Run an end-to-end test before enabling any live customer traffic.
