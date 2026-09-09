"use strict";

const assert = require("assert");
const DashboardReadModel = require("./dashboard-read-model");
const Delivery = require("./delivery");

const delivery = new Delivery();
const serviceManager = {
    listServices: () => [],
    getSummary: () => ({ by_status: {} })
};
const taskManager = {
    listTasks: () => []
};

const dashboard = new DashboardReadModel({ serviceManager, taskManager, delivery });

const first = dashboard.getDelivery();
assert.strictEqual(first.success, true);
assert.strictEqual(first.control_surface, "READ_ONLY");
assert.strictEqual(first.actions_mutable, false);
assert.deepStrictEqual(first.component, delivery.getInfo());
assert.deepStrictEqual(first.health, delivery.healthCheck());

const second = dashboard.getDelivery();
assert.deepStrictEqual(second, first);

assert.strictEqual(delivery.getInfo().id, "DELIVERY");
assert.strictEqual(delivery.getInfo().status, "AVAILABLE");

console.log("Dashboard Delivery read contract: PASS");
