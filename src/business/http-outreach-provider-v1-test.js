"use strict";

const assert = require("assert");
const { HttpOutreachProviderV1 } = require("./http-outreach-provider-v1");

const calls = [];
const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ delivery_id: "delivery-001", accepted: true })
    };
};

(async () => {
    const provider = new HttpOutreachProviderV1({
        endpoint: "https://example.test/outreach",
        token: "test-token",
        fetchImpl
    });

    await assert.rejects(
        () => provider.send({
            id: "outreach-1",
            prospect_name: "Demo Realty",
            channel: "EMAIL",
            body: "Hello",
            status: "PENDING_APPROVAL"
        }),
        /OUTREACH_APPROVAL_REQUIRED/
    );

    const result = await provider.send({
        id: "outreach-1",
        prospect_id: "opp-1",
        prospect_name: "Demo Realty",
        channel: "EMAIL",
        subject: "Quick idea",
        body: "Hello",
        status: "APPROVED"
    });

    assert.equal(result.status, "SENT");
    assert.equal(result.provider_response.delivery_id, "delivery-001");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://example.test/outreach");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.headers.authorization, "Bearer test-token");

    const payload = JSON.parse(calls[0].options.body);
    assert.equal(payload.status, "APPROVED");
    assert.equal(payload.id, "outreach-1");

    await assert.rejects(
        () => new HttpOutreachProviderV1({ endpoint: "", fetchImpl }).send({
            id: "outreach-2",
            prospect_name: "Demo Realty",
            channel: "EMAIL",
            body: "Hello",
            status: "APPROVED"
        }),
        /OUTREACH_ENDPOINT_REQUIRED/
    );

    console.log("HTTP Authorized Outreach Provider V1: PASS");
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
