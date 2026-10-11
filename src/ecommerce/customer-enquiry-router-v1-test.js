'use strict';

const assert = require('node:assert/strict');
const express = require('express');
const { createServer } = require('node:http');
const { createCustomerEnquiryRouter } = require('./customer-enquiry-router-v1');

(async () => {
  const app = express();
  app.use(express.json({ limit: '16kb' }));
  app.use('/api/customer-enquiry', createCustomerEnquiryRouter({
    generateDraft: async ({ storeName, customerMessage }) =>
      'Thanks for contacting ' + storeName + '. We received your message: ' + customerMessage
  }));
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    const good = await fetch('http://127.0.0.1:' + address.port + '/api/customer-enquiry/draft', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ storeName: 'Demo Store', customerMessage: 'Do you have blue shirts?' })
    });
    assert.equal(good.status, 201);
    const payload = await good.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.record.status, 'PENDING_APPROVAL');
    assert.equal(payload.record.sendingEnabled, false);

    const bad = await fetch('http://127.0.0.1:' + address.port + '/api/customer-enquiry/draft', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ storeName: '', customerMessage: 'Hi' })
    });
    assert.equal(bad.status, 400);
    console.log('PASS customer enquiry HTTP integration: valid draft, approval boundary, invalid input');
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
