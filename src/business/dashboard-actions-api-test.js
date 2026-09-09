"use strict";

const assert = require("assert");
const http = require("http");

function request(port, method, path, body) {
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: "127.0.0.1", port, path, method, headers: { "Content-Type": "application/json" } }, res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on("error", reject);
        req.end(body ? JSON.stringify(body) : undefined);
    });
}

(async () => {
    const serverModule = require("../../server");
    const port = serverModule && serverModule.port ? serverModule.port : 3000;
    try {
        const valid = await request(port, "POST", "/api/dashboard/actions", {
            action: "EXECUTE_TASK",
            target: { service_id: "missing-service", task_id: "missing-task" },
            request_id: "dashboard-api-test-1"
        });
        assert.ok([400, 404, 422, 500].includes(valid.status));
        assert.strictEqual(valid.body.success, false);

        const invalid = await request(port, "POST", "/api/dashboard/actions", {
            action: "DELETE_DATABASE",
            target: { service_id: "S1", task_id: "T1" },
            request_id: "dashboard-api-test-2"
        });
        assert.strictEqual(invalid.status, 400);
        assert.strictEqual(invalid.body.success, false);
        assert.match(invalid.body.error, /Unsupported dashboard action/);
        console.log("Dashboard action API contract tests: PASS");
    } finally {
        if (serverModule && serverModule.close) serverModule.close();
    }
})().catch(error => {
    console.error("Dashboard action API contract tests: FAIL");
    console.error(error.message);
    process.exitCode = 1;
});
