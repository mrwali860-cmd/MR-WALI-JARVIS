const FIRST_SERVICE_ID = 'AI_APPOINTMENT_BOOKING_AUTOMATION';
const TARGET_MARKETS = new Set(['REAL_ESTATE', 'HIGH_TICKET_BUSINESSES', 'SERVICE_BUSINESSES']);

function required(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export class BusinessAcquisitionAgentV1 {
  evaluate(input) {
    const prospect = input?.prospect;
    const requestId = input?.request_id;
    const opportunityId = prospect?.opportunity_id;

    const validIdentity = required(requestId) && required(opportunityId);
    const validContext = prospect && required(prospect.company) && required(prospect.contact) && required(prospect.market) && required(prospect.problem);
    const qualified = validIdentity && validContext && TARGET_MARKETS.has(prospect.market);

    if (!qualified) {
      return {
        request_id: requestId ?? null,
        opportunity_id: opportunityId ?? null,
        qualification: 'DISQUALIFIED',
        problem: validContext ? prospect.problem : '',
        service_id: null,
        outreach: { status: 'NOT_READY', channel: null, message: null },
        next_action: 'REVIEW_PROSPECT_CONTEXT',
        evidence: {
          deterministic: true,
          external_execution: false,
          decision_basis: validContext && validIdentity && !TARGET_MARKETS.has(prospect.market)
            ? 'UNSUPPORTED_MARKET'
            : 'MISSING_REQUIRED_CONTEXT'
        }
      };
    }

    return {
      request_id: requestId,
      opportunity_id: opportunityId,
      qualification: 'QUALIFIED',
      problem: prospect.problem,
      service_id: FIRST_SERVICE_ID,
      outreach: {
        status: 'DRAFT',
        channel: 'EMAIL',
        message: `Hello ${prospect.contact}, I noticed a potential issue around ${prospect.problem}. We may be able to help improve lead response and appointment conversion.`
      },
      next_action: 'REQUEST_OUTREACH_APPROVAL',
      evidence: {
        deterministic: true,
        external_execution: false,
        decision_basis: 'TARGET_MARKET_AND_PROBLEM_MATCH'
      }
    };
  }
}
