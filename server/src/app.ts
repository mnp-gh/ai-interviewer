import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance } from "fastify";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createAccountService } from "./account/service";
import { createAiClient, type AiClient } from "./ai/client";
import {
  createModelRegistry,
  createSpeechRegistry,
  createVoiceRegistry,
  INTERVIEWER_VOICES,
  type ModelConfig,
  type ModelRegistry,
} from "./ai/models";
import { createSpeechClient, type SpeechClient } from "./ai/speech";
import { connectToDatabase } from "./db/mongo-client";
import { createTurnstileVerifier, type VerifyHuman } from "./http/botcheck";
import { requireCandidate } from "./http/candidate";
import { errorHandler } from "./http/errors";
import { apiSecurityHeaders } from "./http/security";
import type { ModelOption, SpeechModelsResponse } from "./interview/schemas";
import { createInterviewService } from "./interview/service";
import { accountRoutes } from "./routes/account";
import { adminRoutes } from "./routes/admin";
import { interviewRoutes } from "./routes/interviews";
import { setupRoutes } from "./routes/setup";
import { createTavilyClient, type SearchClient } from "./research/search";
import { budgetFromEnv, type Budget } from "./usage/meter";

export type AppOptions = {
  registry?: ModelRegistry;
  ai?: AiClient;
  speechRegistry?: ModelRegistry;
  voiceRegistry?: ModelRegistry;
  /** Transcribes spoken answers (and voices questions); null disables them. */
  speech?: SpeechClient | null;
  /** Web search for role briefings; null disables research. */
  search?: SearchClient | null;
  budget?: Budget;
  /** Bot check for starting new work; null disables it. Defaults to Turnstile when configured. */
  verifyHuman?: VerifyHuman | null;
  now?: () => Date;
  /** Skips connecting on each request (tests manage their own connection). */
  connect?: () => Promise<unknown>;
};

export function createApp(options: AppOptions = {}): FastifyInstance {
  const registry = options.registry ?? createModelRegistry();
  const ai = options.ai ?? createAiClient(registry);
  const budget = options.budget ?? budgetFromEnv();
  const verifyHuman = options.verifyHuman === undefined ? createTurnstileVerifier() : options.verifyHuman;
  const search = options.search === undefined ? createTavilyClient() : options.search;
  const connect = options.connect ?? connectToDatabase;
  const speechRegistry = options.speechRegistry ?? createSpeechRegistry();
  const voiceRegistry = options.voiceRegistry ?? createVoiceRegistry();
  const speech = options.speech === undefined ? createSpeechClient(speechRegistry) : options.speech;
  const service = createInterviewService({ ai, registry, speech, speechRegistry, voiceRegistry, limits: budget, now: options.now });
  const interviewerVoices = speech && voiceRegistry.defaultModel() && budget.voiceQuestionsGlobal > 0 ? INTERVIEWER_VOICES.map(({ id, label }) => ({ id, label })) : [];
  const account = createAccountService({ now: options.now });

  // No CORS: the site and the API share one origin, so other sites' pages can't call the API.
  // trustProxy stays off: the client IP is read from one header our own proxy sets (see clientIp).
  const app = Fastify({ bodyLimit: 200 * 1024 });
  app.register(cookie);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ code: "NOT_FOUND", message: "Not found" });
  });
  app.addHook("onRequest", apiSecurityHeaders);

  app.register(
    async (api) => {
      // Every API reply identifies the browser, so a new (or pre-cookie) browser gets its cookie from the first call.
      api.addHook(
        "preHandler",
        requireCandidate(async (id) => {
          await connect();
          return !(await account.isSaved(id));
        })
      );
      api.get("/health", async () => ({ ok: true }));
      const modelOptions = (models: ModelRegistry): ModelOption[] => {
        const defaultId = models.defaultModel()?.id;
        return models.available().map((model: ModelConfig) => {
          const provider = models.provider(model.provider);
          return {
            id: model.id,
            label: model.label,
            provider: provider.label,
            note: model.note,
            mayTrainOnInputs: provider.mayTrainOnInputs,
            isDefault: model.id === defaultId,
          };
        });
      };
      api.get("/models", async () => ({ models: modelOptions(registry) }));
      api.get("/speech-models", async (): Promise<SpeechModelsResponse> => ({
        models: speech ? modelOptions(speechRegistry) : [],
        maxRecordingSeconds: budget.recordingSeconds,
        interviewerVoices,
      }));

      // Everything below needs the database.
      api.register(async (db) => {
        db.addHook("onRequest", async () => {
          await connect();
        });
        db.register(setupRoutes, { prefix: "/setup", ai, registry, budget, search, verifyHuman, now: options.now });
        db.register(interviewRoutes, { prefix: "/interviews", service, budget, verifyHuman, now: options.now });
        db.register(accountRoutes, { prefix: "/account", account, budget, verifyHuman, now: options.now });
        db.register(adminRoutes, { prefix: "/admin", account, registry, budget, now: options.now });
      });
    },
    { prefix: "/api" }
  );

  return app;
}

/** Adapts the app to a plain Node request handler (tests). */
export function toNodeHandler(app: FastifyInstance) {
  const ready = app.ready();
  return async (request: IncomingMessage, response: ServerResponse) => {
    await ready;
    app.server.emit("request", request, response);
  };
}


