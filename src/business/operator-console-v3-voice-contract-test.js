"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(process.cwd(), "jarvis.html"), "utf8");
const architecture = fs.readFileSync(path.join(process.cwd(), "docs/architecture/operator-console-v3-voice.md"), "utf8");

function test(name, fn) {
  try { fn(); console.log(`PASS  ${name}`); }
  catch (e) { console.error(`FAIL  ${name}`); console.error(`      ${e.message}`); process.exitCode = 1; }
}

test("V3 architecture defines the locked voice flow", () => {
  assert.ok(architecture.includes("Microphone → SpeechRecognition → transcript → existing /ask flow → JARVIS reply → speechSynthesis"));
  assert.ok(architecture.includes("Voice must never execute a business action directly."));
});

test("Operator console exposes speech recognition", () => {
  assert.ok(html.includes("SpeechRecognition") || html.includes("webkitSpeechRecognition"));
});

test("Operator console exposes speech synthesis", () => {
  assert.ok(html.includes("speechSynthesis"));
});

test("Voice uses the existing /ask conversational boundary", () => {
  assert.ok(html.includes("/ask"));
});

test("Voice has graceful recognition error handling", () => {
  assert.ok(html.includes("onerror"));
  assert.ok(html.includes("onend"));
});

test("Voice can stop speech output", () => {
  assert.ok(html.includes("speechSynthesis.cancel()"));
});

console.log("OPERATOR CONSOLE V3 VOICE CONTRACT TEST: " + (process.exitCode ? "FAILED" : "PASS"));
