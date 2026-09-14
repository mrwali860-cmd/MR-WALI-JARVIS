const OpenAI = require("openai");

const DEFAULT_MODEL = "gpt-5.6-luna";
const FALLBACK_MESSAGE = "Live JARVIS chat is not configured. No action was executed.";
const SYSTEM_INSTRUCTIONS = [
  "You are MR WALI JARVIS, an AI business operator assistant.",
  "For conversational requests, provide concise, practical guidance.",
  "Do not claim that a task was executed, completed, approved, or changed unless the existing execution system actually did it.",
  "Do not invent system state, metrics, tasks, or results.",
  "Business actions are handled by the existing command and execution architecture, not by this chat adapter.",
  "If the request is ambiguous, ask a concise clarification question."
].join(" ");

class JarvisChatV2 {
  constructor({ apiKey = process.env.OPENAI_API_KEY, model = process.env.EMPIRE_LLM_MODEL || DEFAULT_MODEL, client = null, fallbackMessage = FALLBACK_MESSAGE } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.fallbackMessage = fallbackMessage;
    this.client = client || (apiKey ? new OpenAI({ apiKey }) : null);
  }

  async respond(message, context = {}) {
    if (!this.client) {
      return { chatMode: "FALLBACK", reply: this.fallbackMessage };
    }

    try {
      const response = await this.client.responses.create({
        model: this.model,
        instructions: SYSTEM_INSTRUCTIONS,
        input: JSON.stringify({ message, context })
      });
      const reply = typeof response.output_text === "string" ? response.output_text.trim() : "";
      if (!reply) return { chatMode: "FALLBACK", reply: this.fallbackMessage };
      return { chatMode: "LLM", reply };
    } catch (_) {
      return { chatMode: "FALLBACK", reply: this.fallbackMessage };
    }
  }
}

module.exports = JarvisChatV2;
