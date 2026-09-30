"use strict";

const assert = require("node:assert/strict");
const { EcommerceOperationsAdapterV1, SUPPORTED_ACTIONS } = require("./ecommerce-operations-adapter-v1");

async function run() {
    assert.throws(() => new EcommerceOperationsAdapterV1(), /ECOMMERCE_PROVIDER_REQUIRED/);

    let received = null;
    const adapter = new EcommerceOperationsAdapterV1({
        provider: {
            async execute(payload) {
                received = payload;
                return { ok: true, reference: "mock-ecommerce-result" };
            }
        }
    });

    const result = await adapter.execute({
        action: "PRODUCT_RESEARCH",
        input: { query: "wireless desk accessories" },
        request_id: "req-ecommerce-001",
        service_id: "ECOMMERCE_OPERATIONS_AUTOMATION",
        task_id: "PRODUCT_RESEARCH"
    });

    assert.equal(result.adapter, "ECOMMERCE_OPERATIONS");
    assert.equal(result.version, "1.0.0");
    assert.equal(result.status, "EXECUTED");
    assert.deepEqual(received, {
        action: "PRODUCT_RESEARCH",
        input: { query: "wireless desk accessories" },
        request_id: "req-ecommerce-001",
        service_id: "ECOMMERCE_OPERATIONS_AUTOMATION",
        task_id: "PRODUCT_RESEARCH"
    });

    await assert.rejects(
        () => adapter.execute({ action: "UNKNOWN_ACTION" }),
        /UNSUPPORTED_ECOMMERCE_ACTION/
    );

    assert.equal(SUPPORTED_ACTIONS.length, 11);
    console.log("E-commerce operations adapter contract: PASS");
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
