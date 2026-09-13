"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(process.cwd(), "jarvis.html"), "utf8");
function test(name, fn){try{fn();console.log(`PASS  ${name}`)}catch(e){console.error(`FAIL  ${name}`);console.error(`      ${e.message}`);process.exitCode=1}}
test("Operator console has live core visual and animation",()=>{assert.ok(html.includes("/assets/jarvis-core.jpg"));assert.ok(html.includes("@keyframes orbit"));assert.ok(html.includes("@keyframes glow"));assert.ok(html.includes("@keyframes power"))});
test("Operator console exposes chat and voice",()=>{assert.ok(html.includes("Give JARVIS a task"));assert.ok(html.includes("/ask"));assert.ok(html.includes("SpeechRecognition"))});
test("Operator console uses dashboard read surfaces",()=>{assert.ok(html.includes("/api/dashboard/status"));assert.ok(html.includes("/api/dashboard/tasks"))});
test("Operator console delegates actions through dashboard boundary",()=>{assert.ok(html.includes("/api/dashboard/actions"));assert.ok(html.includes("EXECUTE_TASK"));assert.ok(html.includes("request_id"))});
test("Operator console has explicit approval UX",()=>{assert.ok(html.includes("WAITING_FOR_APPROVAL"));assert.ok(html.includes("Approval required"));assert.ok(html.includes("Approve & Execute"))});
console.log("JARVIS operator UI contract: " + (process.exitCode ? "FAILED" : "PASS"));
