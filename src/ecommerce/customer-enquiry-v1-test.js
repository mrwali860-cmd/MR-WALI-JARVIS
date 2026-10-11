'use strict';

const assert = require('node:assert/strict');
const { createEnquiryDraft, approveDraft, recordDeliveryResult, needsHumanReview } = require('./customer-enquiry-v1');

(async () => {
  const input = {
    storeName: 'Demo Store',
    customerMessage: 'Where is my order?',
    policyContext: 'Orders normally ship in 2-4 business days.'
  };
  const draft = await createEnquiryDraft(input);
  assert.equal(draft.status, 'PENDING_APPROVAL');
  assert.equal(draft.approvalRequired, true);
  assert.equal(draft.sendingEnabled, false);
  assert.ok(draft.draft.length > 0);
  assert.throws(() => approveDraft(draft, { approvedBy: 'tester' }), /requires human review/);
  const approved = approveDraft(draft, { approvedBy: 'tester', editedDraft: 'Thanks for contacting us. Please share your order number so we can check.' });
  assert.equal(approved.status, 'APPROVED_NOT_SENT');
  assert.throws(() => recordDeliveryResult(approved, { verified: false }), /without verified provider evidence/);
  const delivered = recordDeliveryResult(approved, { verified: true, providerMessageId: 'demo-provider-id-123' });
  assert.equal(delivered.status, 'DELIVERY_VERIFIED');
  assert.equal(delivered.delivery.providerMessageId, 'demo-provider-id-123');
  assert.equal(needsHumanReview('I want a refund'), true);
  assert.equal(needsHumanReview('What colors are available?'), false);
  await assert.rejects(() => createEnquiryDraft({ storeName: 'Demo Store', customerMessage: 'Hi' }, {
    generateDraft: async () => ''
  }), /generated draft is required/);
  await assert.rejects(() => createEnquiryDraft({ storeName: '', customerMessage: 'Hi' }), /storeName is required/);
  console.log('PASS customer enquiry V1: draft-only, approval gate, sensitive review, and delivery evidence');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
