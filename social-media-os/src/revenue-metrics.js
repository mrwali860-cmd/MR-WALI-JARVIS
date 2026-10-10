'use strict';

function nonNegativeNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${field} must be a finite non-negative number`);
  }
  return value;
}

function calculateMetrics(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const views = nonNegativeNumber(input.views ?? 0, 'views');
  const leads = nonNegativeNumber(input.leads ?? 0, 'leads');
  const clients = nonNegativeNumber(input.clients ?? 0, 'clients');
  const sales = nonNegativeNumber(input.sales ?? 0, 'sales');
  const revenue = nonNegativeNumber(input.revenue ?? 0, 'revenue');
  const costs = nonNegativeNumber(input.costs ?? 0, 'costs');
  return {
    views, leads, clients, sales, revenue, costs,
    netRevenue: revenue - costs,
    leadRate: views > 0 ? leads / views : null,
    clientRate: leads > 0 ? clients / leads : null,
    revenuePerLead: leads > 0 ? revenue / leads : null,
    costPerLead: leads > 0 ? costs / leads : null,
    roi: costs > 0 ? (revenue - costs) / costs : null,
    note: 'Metrics are only as reliable as the manually or externally verified inputs; this module does not collect analytics or prove attribution.'
  };
}

module.exports = { calculateMetrics };
