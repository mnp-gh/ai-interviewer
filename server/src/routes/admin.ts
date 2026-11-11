import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import type { AccountService } from "../account/service";
import type { ModelRegistry } from "../ai/models";
import { requireAdmin } from "../http/admin";
import { deleteRecordingsBefore, recordingStorage } from "../interview/recordings";
import type { UsageReport } from "../interview/schemas";
import { usageOn, type Budget } from "../usage/meter";

export type AdminRoutesOptions = {
  account: AccountService;
  registry: ModelRegistry;
  budget: Budget;
  now?: () => Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export const adminRoutes: FastifyPluginAsync<AdminRoutesOptions> = async (
  app,
  { account, registry, budget, now = () => new Date() }
) => {
  app.addHook("onRequest", requireAdmin());

  /** Today's (or yesterday's) usage across everyone, and what's left of each daily cap. */
  app.get("/usage", async (req): Promise<UsageReport> => {
    const today = isoDay(now());
    const yesterday = isoDay(new Date(now().getTime() - DAY_MS));
    const { day = today } = z.object({ day: z.enum([today, yesterday]).optional() }).parse(req.query);

    const usage = await usageOn(day);
    const stored = await recordingStorage();
    const saved = await account.savedAmong(usage.candidates.map((candidate) => candidate.id));
    const remaining = (used: number, limit: number) => Math.max(0, limit - used);

    return {
      day,
      today,
      yesterday,
      tokens: { used: usage.tokens, limit: budget.tokensGlobal, remaining: remaining(usage.tokens, budget.tokensGlobal) },
      searches: { used: usage.searches, limit: budget.searchesGlobal, remaining: remaining(usage.searches, budget.searchesGlobal) },
      audioSeconds: {
        used: usage.audioSeconds,
        limit: budget.audioSecondsGlobal,
        remaining: remaining(usage.audioSeconds, budget.audioSecondsGlobal),
      },
      interviewerVoice: {
        used: usage.voiceQuestions,
        limit: budget.voiceQuestionsGlobal,
        remaining: remaining(usage.voiceQuestions, budget.voiceQuestionsGlobal),
      },
      interviewerVoiceCharacters: {
        used: usage.voiceCharacters,
        limit: budget.voiceCharactersGlobal,
        remaining: remaining(usage.voiceCharacters, budget.voiceCharactersGlobal),
      },
      recordings: {
        count: stored.count,
        bytes: stored.bytes,
        limitBytes: budget.recordingStorageBytes,
        oldest: stored.oldest?.toISOString() ?? null,
      },
      interviewsStarted: usage.candidates.reduce((sum, candidate) => sum + candidate.interviews, 0),
      models: registry.available().map((model) => {
        const used = usage.models[model.id] ?? 0;
        const limit = model.dailyTokens ?? null;
        return {
          id: model.id,
          label: model.label,
          provider: registry.provider(model.provider).label,
          used,
          limit,
          remaining: limit === null ? null : remaining(used, limit),
        };
      }),
      candidates: usage.candidates.map((candidate) => ({ ...candidate, saved: saved.has(candidate.id) })),
      networks: usage.networks,
      limits: {
        tokensPerCandidate: budget.tokensPerCandidate,
        tokensPerIp: budget.tokensPerIp,
        interviewsPerCandidate: budget.interviewsPerCandidate,
        interviewsPerIp: budget.interviewsPerIp,
        searchesPerIp: budget.searchesPerIp,
      },
    };
  });

  /** Deletes recordings older than the given number of days; their transcripts and delivery stay. */
  app.delete("/recordings", async (req) => {
    const { olderThanDays } = z.object({ olderThanDays: z.coerce.number().int().min(0).max(3650) }).parse(req.query);
    const deleted = await deleteRecordingsBefore(new Date(now().getTime() - olderThanDays * DAY_MS));
    return { deleted };
  });
};
