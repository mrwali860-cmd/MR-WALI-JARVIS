"use strict";
const assert=require("assert");
const {InboundReplyWebhookV1}=require("./inbound-reply-webhook-v1");
const a=new InboundReplyWebhookV1({secret:"s"});
assert.equal(a.accept({request_id:"r",opportunity_id:"o",text:"Yes"},"bad").status,"REJECTED");
const x=a.accept({request_id:"r",opportunity_id:"o",text:"Yes",source:"EMAIL",external_message_id:"m1"},"s");
assert.equal(x.status,"ACCEPTED"); assert.equal(x.source,"EMAIL"); assert.equal(x.external_message_id,"m1");
assert.equal(a.accept({request_id:"r",opportunity_id:"o"},"s").reason,"REQUIRED_REPLY_CONTEXT_MISSING");
console.log("Inbound Reply Webhook V1: PASS");
