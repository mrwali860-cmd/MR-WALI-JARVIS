const fs = require("fs");
const path = require("path");

const server = fs.readFileSync(path.join(__dirname, "..", "..", "server.js"), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(server.includes('require("./src/business/jarvis-chat-v2")'), "server.js must require JarvisChatV2");
assert(server.includes("function getJarvisChatV2()"), "server.js must expose a lazy JarvisChatV2 boundary");
assert(server.includes("getJarvisChatV2().respond(message"), "POST /ask must delegate conversational responses to JarvisChatV2");
assert(server.includes('chatMode: chat.chatMode'), "POST /ask must preserve JarvisChatV2 chatMode");
assert(server.includes('actionExecuted: false'), "LLM chat must never claim execution");
assert(!server.includes('require("child_process")'), "server.js must not own an LLM subprocess bridge");
assert(!server.includes("execFileSync"), "server.js must not execute the Python LLM client directly");
assert(!server.includes("getLLMClient"), "server.js must not contain a duplicate LLM client boundary");
assert(!server.includes("async function chatWithLLM"), "server.js must not contain duplicate conversational generation logic");

console.log("OPERATOR CONSOLE V2 SERVER INTEGRATION CONTRACT TEST: PASS");
