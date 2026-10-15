'use strict';

const crypto = require('node:crypto');

const SENSITIVE_PATTERNS = [
  /refund|chargeback|money back/i,
  /cancel|cancellation/i,
  /legal|lawyer|lawsuit/i,
  /allerg|injur|medical/i,
  /password|credit card|bank account/i,
];

function requiredText(value, field, max = 4000) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(field + ' is required');
  }
  const clean = value.trim();
  if (clean.length > max) throw new RangeError(field + ' exceeds ' + max + ' characters');
  return clean;
}

function needsHumanReview(message) {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Creates a response draft only. It never sends messages.
 * Inject generateDraft to use a real model provider; keep credentials outside this module.
 */
async function createEnquiryDraft(input, { generateDraft } = {}) {
  if (!input || typeof input !== 'object') throw new TypeError('input is required');
  const customerMessage = requiredText(input.customerMessage, 'customerMessage');
  const storeName = requiredText(input.storeName, 'storeName', 160);
  const policyContext = typeof input.policyContext === 'string' ? input.policyContext.trim().slice(0, 5000) : '';
  const productContext = typeof input.productContext === 'string' ? input.productContext.trim().slice(0, 3000) : '';
  const id = crypto.randomUUID();
  const reviewRequired = needsHumanReview(customerMessage);

  let draft;
  if (typeof generateDraft === 'function') {
    draft = await generateDraft({
      storeName,
      customerMessage,
      policyContext,
      productContext,
      instructions: [
        'Write a concise, polite customer-support reply.',
        'Use only facts present in the supplied context.',
        'Never invent prices, stock, shipping dates, refunds, or promises.',
        'If context is insufficient, ask one clarifying question.',
        'This is a draft for human approval; do not claim an action has been taken.'
      ].join(' ')
    });
  } else {
    draft = 'Hi! Thanks for contacting ' + storeName + '. We received your question and will check the details before confirming. Could you share any relevant order or product details so we can help accurately?';
  }
  draft = requiredText(draft, 'generated draft', 5000);

  return {
    id,
    status: 'PENDING_APPROVAL',
    storeName,
    customerMessage,
    draft,
    reviewRequired,
    approvalRequired: true,
    sendingEnabled: false,
    createdAt: new Date().toISOString(),
    events: [{ type: 'DRAFT_CREATED', at: new Date().toISOString() }]
  };
}

/** Approves a draft for a later, separately authorized delivery step. Does not send. */
function approveDraft(record, { approvedBy, editedDraft } = {}) {
  if (!record || record.status !== 'PENDING_APPROVAL') {
    throw new Error('Only pending drafts can be approved');
  }
  const approver = requiredText(approvedBy, 'approvedBy', 160);
  if (editedDraft === undefined) {
    throw new Error('Human approval requires human review of an explicitly reviewed draft');
  }
  const draft = editedDraft === undefined ? record.draft : requiredText(editedDraft, 'editedDraft', 5000);
  const at = new Date().toISOString();
  return {
    ...record,
    draft,
    status: 'APPROVED_NOT_SENT',
    approvedBy: approver,
    approvedAt: at,
    events: [...record.events, { type: 'HUMAN_APPROVED', at, approvedBy: approver }]
  };
}

/**
 * Delivery is deliberately not implemented in V1. This prevents a draft/approval
 * from being mistaken for a sent message. A future provider adapter must return
 * a verifiable provider message ID before marking delivery successful.
 */
function recordDeliveryResult(record, result) {
  if (!record || record.status !== 'APPROVED_NOT_SENT') {
    throw new Error('Only approved drafts may enter delivery verification');
  }
  if (!result || result.verified !== true || typeof result.providerMessageId !== 'string' || !result.providerMessageId.trim()) {
    throw new Error('Delivery cannot be marked successful without verified provider evidence');
  }
  const at = new Date().toISOString();
  return {
    ...record,
    status: 'DELIVERY_VERIFIED',
    delivery: { providerMessageId: result.providerMessageId.trim(), verifiedAt: at },
    events: [...record.events, { type: 'DELIVERY_VERIFIED', at, providerMessageId: result.providerMessageId.trim() }]
  };
}

module.exports = { createEnquiryDraft, approveDraft, recordDeliveryResult, needsHumanReview };
