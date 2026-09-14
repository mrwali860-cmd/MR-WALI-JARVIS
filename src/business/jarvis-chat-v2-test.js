const assert = require("assert");
const JarvisChatV2 = require("./jarvis-chat-v2");

async function run() {
  let calls = 0;
  const fakeClient = {
    responses: {
      create: async ({ model, instructions, input }) => {
        calls += 1;
        assert.strictEqual(model, "test-model");
        assert.ok(instructions.includes("MR WALI JARVIS"));
        assert.ok(input.includes("hello"));
        return { output_text: "Hello from the JARVIS chat layer." };
      }
    }
  };

  const success = await new JarvisChatV2({ apiKey: "test-key", model: "test-model", client: fakeClient }).respond("hello");
  assert.strictEqual(success.chatMode, "LLM");
  assert.strictEqual(success.reply, "Hello from the JARVIS chat layer.");
  assert.strictEqual(calls, 1);

  const missingKey = await new JarvisChatV2({ apiKey: null }).respond("do something");
  assert.strictEqual(missingKey.chatMode, "FALLBACK");
  assert.ok(missingKey.reply.includes("No action was executed"));

  const failingClient = { responses: { create: async () => { throw new Error("provider unavailable"); } } };
  const failure = await new JarvisChatV2({ apiKey: "test-key", client: failingClient }).respond("hello");
  assert.strictEqual(failure.chatMode, "FALLBACK");
  assert.ok(failure.reply.includes("No action was executed"));

  console.log("JARVIS CHAT V2 TEST: PASS");
}

run().catch(error => {
  console.error("JARVIS CHAT V2 TEST: FAIL");
  console.error(error);
  process.exit(1);
});
