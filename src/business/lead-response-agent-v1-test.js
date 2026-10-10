"use strict";
const assert=require("assert");
const {createLeadResponse,validateLead,parseAnalysis}=require("./lead-response-agent-v1");
(async()=>{
assert.match(validateLead(null),/JSON object/);assert.match(validateLead({message:"x"}),/3 characters/);assert.strictEqual(validateLead({message:"Need a flat"}),null);assert.match(validateLead({message:"Need a flat",email:"not-an-email"}),/valid email/);assert.strictEqual(validateLead({message:"Need a flat",email:"test@example.com"}),null);
assert.throws(()=>parseAnalysis("no json"));assert.throws(()=>parseAnalysis(JSON.stringify({lead_score:"VERY HOT",reply_draft:"Hello"})));
assert.strictEqual((await createLeadResponse({message:"Need a flat"},{apiKey:""})).statusCode,503);
let called=false;const ok=await createLeadResponse({name:"Test",email:"test@example.com",message:"Need a flat"}, {apiKey:"test",webhookUrl:"",fetchImpl:async(_u,o)=>{called=true;assert.strictEqual(JSON.parse(o.body).response_format.type,"json_object");return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({intent:"Property enquiry",lead_score:"HOT",reply_draft:"What area and budget?"})}}]})}}});
assert(called);assert(ok.ok);assert.strictEqual(ok.data.lead.email,"test@example.com");assert.strictEqual(ok.data.analysis.lead_score,"HOT");assert.strictEqual(ok.data.approved_for_sending,false);assert.strictEqual(ok.data.delivery_status,"DRAFT_ONLY");
const fail=await createLeadResponse({message:"Need a flat"},{apiKey:"test",webhookUrl:"",fetchImpl:async()=>({ok:false,status:401,json:async()=>({})})});assert.strictEqual(fail.statusCode,502);
console.log("lead-response-agent-v1-test: PASS");
})();