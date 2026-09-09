"use strict";

const assert = require("assert");
const ClientApproval = require("./client-approval");
const DashboardReadModel = require("./dashboard-read-model");

const clientApproval = new ClientApproval();
const serviceManager = { listServices: () => [], getSummary: () => ({ by_status: {} }) };
const taskManager = { listTasks: () => [] };
const dashboard = new DashboardReadModel({ serviceManager, taskManager, clientApproval });

const result = dashboard.getClientApproval();
assert.strictEqual(result.success, true);
assert.strictEqual(result.control_surface, "READ_ONLY");
assert.strictEqual(result.actions_mutable, false);
assert.deepStrictEqual(result.component, clientApproval.getInfo());
assert.deepStrictEqual(result.health, clientApproval.healthCheck());

assert.strictEqual(typeof dashboard.getClientApproval, "function");
assert.strictEqual(typeof result.component.decide, "undefined");

const before = JSON.stringify(clientApproval.getInfo());
const second = dashboard.getClientApproval();
assert.strictEqual(JSON.stringify(clientApproval.getInfo()), before);
assert.deepStrictEqual(second, result);

console.log("DASHBOARD CLIENT APPROVAL CONTRACT TESTS PASSED");
