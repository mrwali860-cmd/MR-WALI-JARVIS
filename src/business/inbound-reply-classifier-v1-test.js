"use strict";

const assert = require("assert");
const { InboundReplyClassifierV1 } = require("./inbound-reply-classifier-v1");

const classifier = new InboundReplyClassifierV1();

assert.equal(classifier.classify({request_id:"r1",opportunity_id:"o1",text:"Yes, let's have a call tomorrow",source:"EMAIL"}).classification,"MEETING_INTENT");
assert.equal(classifier.classify({request_id:"r1",opportunity_id:"o1",text:"I am interested, send details",source:"EMAIL"}).classification,"INTERESTED");
assert.equal(classifier.classify({request_id:"r1",opportunity_id:"o1",text:"No thanks, not interested",source:"EMAIL"}).classification,"NOT_INTERESTED");
assert.equal(classifier.classify({request_id:"r1",opportunity_id:"o1",text:"Can you explain your service?",source:"EMAIL"}).classification,"NEEDS_REVIEW");
assert.equal(classifier.classify({request_id:"r1",opportunity_id:"o1",text:"Stop contacting me",source:"EMAIL"}).next_action,"STOP_OUTREACH");
assert.equal(classifier.classify({request_id:"r1",opportunity_id:"",text:"Yes"}).status,"REJECTED");

console.log("Inbound Reply Classifier V1: PASS");
