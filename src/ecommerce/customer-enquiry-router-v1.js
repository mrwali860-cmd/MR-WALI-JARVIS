'use strict';

const express = require('express');
const { createEnquiryDraft } = require('./customer-enquiry-v1');

function createCustomerEnquiryRouter({ generateDraft } = {}) {
  const router = express.Router();

  router.post('/draft', async (req, res) => {
    try {
      const body = req.body || {};
      const record = await createEnquiryDraft({
        storeName: body.storeName,
        customerMessage: body.customerMessage,
        policyContext: body.policyContext,
        productContext: body.productContext
      }, { generateDraft });
      return res.status(201).json({ ok: true, record });
    } catch (error) {
      const status = error instanceof TypeError || error instanceof RangeError ? 400 : 502;
      return res.status(status).json({
        ok: false,
        error: status === 400 ? error.message : 'Unable to create enquiry draft'
      });
    }
  });

  return router;
}

module.exports = { createCustomerEnquiryRouter };
