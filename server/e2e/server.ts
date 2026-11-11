// The real app for the end-to-end test, with the tests' scripted AI and speech and an in-memory MongoDB,
// so a browser can run a whole interview without calling any provider. Started by e2e/playwright.config.ts.
import { MongoMemoryServer } from "mongodb-memory-server";
import type { AiClient } from "../src/ai/client";
import { createApp } from "../src/app";
import { DEFAULT_BUDGET } from "../src/usage/meter";
import { fakeAi, fakeSpeech, registry, speechRegistry, voiceRegistry } from "../test/fakes";

const PORT = Number(process.env.PORT) || 8090;

/**
 * Streams the scripted text a word every 20 ms, like a real model, rather than all at once. An instant
 * first question lands before the interview page's own load of the interview, which then overwrites it.
 */
function paced(ai: AiClient): AiClient {
  return {
    async *stream(model, messages, onTokens) {
      for await (const delta of ai.stream(model, messages, onTokens)) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        yield delta;
      }
    },
    json: (model, messages, schema, onTokens) => ai.json(model, messages, schema, onTokens),
  };
}

async function main() {
  const mongo = await MongoMemoryServer.create();
  // The app connects with the same code as in production, just to this database.
  process.env.MONGODB_URI = mongo.getUri();
  // No Turnstile secret, so the bot check is off, as in local development.
  delete process.env.TURNSTILE_SECRET_KEY;

  // Every run comes from one IP within a minute or two, so the rate limits are raised out of the way.
  const budget = { ...DEFAULT_BUDGET, aiCallsPerMinute: 10_000, interviewsPerIp: 10_000, tokensPerIp: 100_000_000, tokensGlobal: 100_000_000 };
  const app = createApp({ registry, speechRegistry, voiceRegistry, ai: paced(fakeAi()), speech: fakeSpeech(), search: null, budget });
  await app.listen({ port: PORT, host: "127.0.0.1" });
  console.log(`E2E server is running on http://127.0.0.1:${PORT}`);

  const stop = async () => {
    await app.close();
    await mongo.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
