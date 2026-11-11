import mongoose, { Schema } from "mongoose";
import { isIPv6 } from "node:net";
import type { ModelConfig } from "../ai/models";
import { HttpError } from "../http/errors";

/**
 * Usage budgets that keep the shared free API keys usable for everyone.
 * Per-person limits stop one candidate (or IP) from hogging capacity; global caps stay safely
 * under the providers' free quotas, so the app degrades with a clear message instead of failing.
 */
export type Budget = {
  interviewsPerCandidate: number;
  interviewsPerIp: number;
  /** Daily AI tokens (prompt + completion) per candidate. */
  tokensPerCandidate: number;
  tokensPerIp: number;
  /** Burst limit in AI calls, per candidate and per IP: providers rate-limit requests per minute. */
  aiCallsPerMinute: number;
  /** Daily AI tokens across all users; keep it under the providers' free daily token quotas. */
  tokensGlobal: number;
  /** Web searches across all users (cache misses only). Tavily's free tier is ~1,000 a month. */
  searchesGlobal: number;
  /** Web searches per IP, so one network can't use up the global searches. */
  searchesPerIp: number;
  /** Passkey and sign-in attempts per IP per minute: each stores a challenge. */
  accountActionsPerMinute: number;
  /** Daily seconds of spoken answers transcribed, per candidate and per IP. */
  audioSecondsPerCandidate: number;
  audioSecondsPerIp: number;
  /** Daily seconds transcribed across all users; keep it under Groq's free 28,800 a day. */
  audioSecondsGlobal: number;
  /** The longest one spoken attempt may be. */
  recordingSeconds: number;
  /** Stored recordings stop being kept past this, so they can't fill the free database. */
  recordingStorageBytes: number;
  /** Questions read by the enhanced interviewer voice a day, per candidate and per IP; past them, the browser's voice reads. */
  voiceQuestionsPerCandidate: number;
  voiceQuestionsPerIp: number;
  /** Across everyone: keep under Groq's free 100 requests a day for Orpheus. */
  voiceQuestionsGlobal: number;
  /** Characters read across everyone; Orpheus counts about a token a character against a small daily quota. */
  voiceCharactersGlobal: number;
  /** Groq allows Orpheus 10 requests a minute, for the whole app. */
  voiceQuestionsPerMinute: number;
};

export const DEFAULT_BUDGET: Budget = {
  interviewsPerCandidate: 5,
  interviewsPerIp: 5,
  tokensPerCandidate: 150_000,
  tokensPerIp: 300_000,
  aiCallsPerMinute: 20,
  tokensGlobal: 1_500_000,
  searchesGlobal: 30,
  searchesPerIp: 9,
  accountActionsPerMinute: 10,
  audioSecondsPerCandidate: 30 * 60,
  audioSecondsPerIp: 30 * 60,
  audioSecondsGlobal: 7 * 60 * 60,
  recordingSeconds: 120,
  recordingStorageBytes: 350 * 1024 * 1024,
  voiceQuestionsPerCandidate: 12,
  voiceQuestionsPerIp: 12,
  voiceQuestionsGlobal: 90,
  voiceCharactersGlobal: 3_400,
  voiceQuestionsPerMinute: 9,
};

/** Reads overrides such as DAILY_TOKENS=2000000 from the environment. */
export function budgetFromEnv(env: NodeJS.ProcessEnv = process.env): Budget {
  const read = (name: string, fallback: number) => {
    const raw = env[name];
    const value = Number(raw);
    return raw !== undefined && raw !== "" && Number.isFinite(value) && value >= 0 ? value : fallback;
  };
  return {
    interviewsPerCandidate: read("DAILY_INTERVIEWS_PER_CANDIDATE", DEFAULT_BUDGET.interviewsPerCandidate),
    interviewsPerIp: read("DAILY_INTERVIEWS_PER_IP", DEFAULT_BUDGET.interviewsPerIp),
    tokensPerCandidate: read("DAILY_TOKENS_PER_CANDIDATE", DEFAULT_BUDGET.tokensPerCandidate),
    tokensPerIp: read("DAILY_TOKENS_PER_IP", DEFAULT_BUDGET.tokensPerIp),
    aiCallsPerMinute: read("AI_CALLS_PER_MINUTE", DEFAULT_BUDGET.aiCallsPerMinute),
    tokensGlobal: read("DAILY_TOKENS", DEFAULT_BUDGET.tokensGlobal),
    searchesGlobal: read("DAILY_SEARCHES", DEFAULT_BUDGET.searchesGlobal),
    searchesPerIp: read("DAILY_SEARCHES_PER_IP", DEFAULT_BUDGET.searchesPerIp),
    accountActionsPerMinute: read("ACCOUNT_ACTIONS_PER_MINUTE", DEFAULT_BUDGET.accountActionsPerMinute),
    audioSecondsPerCandidate: read("DAILY_AUDIO_SECONDS_PER_CANDIDATE", DEFAULT_BUDGET.audioSecondsPerCandidate),
    audioSecondsPerIp: read("DAILY_AUDIO_SECONDS_PER_IP", DEFAULT_BUDGET.audioSecondsPerIp),
    audioSecondsGlobal: read("DAILY_AUDIO_SECONDS", DEFAULT_BUDGET.audioSecondsGlobal),
    recordingSeconds: read("MAX_RECORDING_SECONDS", DEFAULT_BUDGET.recordingSeconds),
    recordingStorageBytes: read("RECORDING_STORAGE_MB", DEFAULT_BUDGET.recordingStorageBytes / 1024 / 1024) * 1024 * 1024,
    voiceQuestionsPerCandidate: read("DAILY_VOICE_QUESTIONS_PER_CANDIDATE", DEFAULT_BUDGET.voiceQuestionsPerCandidate),
    voiceQuestionsPerIp: read("DAILY_VOICE_QUESTIONS_PER_IP", DEFAULT_BUDGET.voiceQuestionsPerIp),
    voiceQuestionsGlobal: read("DAILY_VOICE_QUESTIONS", DEFAULT_BUDGET.voiceQuestionsGlobal),
    voiceCharactersGlobal: read("DAILY_VOICE_CHARACTERS", DEFAULT_BUDGET.voiceCharactersGlobal),
    voiceQuestionsPerMinute: read("VOICE_QUESTIONS_PER_MINUTE", DEFAULT_BUDGET.voiceQuestionsPerMinute),
  };
}

const counterSchema = new Schema(
  {
    key: { type: String, required: true },
    window: { type: String, required: true },
    count: { type: Number, default: 0 },
    // Lets Mongo delete old counters on its own.
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { collection: "usage_counters" }
);
counterSchema.index({ key: 1, window: 1 }, { unique: true });
const CounterModel = mongoose.model("UsageCounter", counterSchema);

type Check = { key: string; window: string; limit: number; ttlMs: number; error: () => HttpError };

const DAY_MS = 24 * 60 * 60 * 1000;
const MODEL_TOKENS = "tokens:model:";

/**
 * The network an IP's limits are counted against. An IPv6 client usually controls a whole /64
 * (2^64 addresses), so counting single addresses would let it reset its limits at will.
 */
export function ipNetwork(ip: string): string {
  const address = ip.replace(/%.*$/, ""); // zone id, e.g. fe80::1%en0
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return mapped[1]!;
  if (!isIPv6(address)) return address;
  // An embedded IPv4 tail (e.g. 64:ff9b::1.2.3.4) stands for the last two groups.
  const hex = address.replace(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/, (_, a, b, c, d) =>
    [(+a << 8) | +b, (+c << 8) | +d].map((group) => group.toString(16)).join(":")
  );
  const [head = "", tail] = hex.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = tail === undefined ? left : [...left, ...Array<string>(8 - left.length - right.length).fill("0"), ...right];
  return `${groups.slice(0, 4).map((group) => parseInt(group, 16).toString(16)).join(":")}::/64`;
}

/** Throws the first check's error whose counter has no room for its amount. */
async function ensureRoom(checks: { check: Check; amount: number }[]) {
  const existing = await CounterModel.find({ $or: checks.map(({ check: { key, window } }) => ({ key, window })) }).lean();
  for (const { check, amount } of checks) {
    const used = existing.find((counter) => counter.key === check.key && counter.window === check.window)?.count ?? 0;
    if (used + amount > check.limit) throw check.error();
  }
}

async function add(checks: Check[], amount: number, now: Date) {
  await CounterModel.bulkWrite(
    checks.map(({ key, window, ttlMs }) => ({
      updateOne: {
        filter: { key, window },
        update: { $inc: { count: amount }, $setOnInsert: { expiresAt: new Date(now.getTime() + ttlMs) } },
        upsert: true,
      },
    }))
  );
}

/**
 * Counts `amount` against every check, or throws the first exceeded check's error without counting.
 * (Two requests racing at the very edge can both pass; for budgets this size that's acceptable.)
 */
async function charge(checks: Check[], amount: number, now: Date) {
  await ensureRoom(checks.map((check) => ({ check, amount })));
  await add(checks, amount, now);
}

const dailyLimit = (message: string) => () => new HttpError(429, "DAILY_LIMIT", message);
const slowDown = () => new HttpError(429, "RATE_LIMITED", "You're going a little fast. Wait a minute, then try again.");
const atCapacity = () =>
  new HttpError(
    503,
    "CAPACITY",
    "We've used up today's free AI capacity across everyone using the app. Please come back tomorrow."
  );
const modelAtCapacity = (label: string) => () =>
  new HttpError(503, "MODEL_UNAVAILABLE", `${label} has used up today's free capacity. Switch to another model, or come back tomorrow.`);

export type Meter = {
  /** Counts a new interview (or practising again). */
  startInterview(): Promise<void>;
  /**
   * Right before AI calls to `model`: throws when a daily token budget (or the model's own cap) is
   * used up, and counts the calls against the per-minute limit. A call's tokens are known only once
   * it finishes, so the last one may overshoot.
   */
  aiCalls(model: ModelConfig, calls?: number): Promise<void>;
  /** After an AI call: adds the tokens it used to the daily budgets, and to its model's count. */
  tokens(count: number, modelId: string): Promise<void>;
  /** Counts uncached web searches. */
  searches(amount: number): Promise<void>;
  /** Counts a passkey or sign-in attempt against the per-minute limit. */
  accountAction(): Promise<void>;
  /**
   * Right before transcribing a spoken answer: throws when a daily audio budget is used up, and counts
   * the call against the per-minute AI limit. Its length is known only afterwards, like tokens.
   */
  audioCall(): Promise<void>;
  /** After transcribing: adds the seconds of audio to the daily budgets. */
  audioSeconds(seconds: number): Promise<void>;
  /** Counts a question read by the enhanced interviewer voice, or throws when a budget for it is used up. */
  interviewerVoice(characters: number): Promise<void>;
};

export function createMeter(budget: Budget, subject: { candidateId: string; ip: string }, now = new Date()): Meter {
  const day = now.toISOString().slice(0, 10);
  const minute = now.toISOString().slice(0, 16);
  const candidate = `candidate:${subject.candidateId}`;
  const ip = `ip:${ipNetwork(subject.ip)}`;
  const daily = (key: string, limit: number, error: () => HttpError): Check => ({
    key,
    window: day,
    limit,
    ttlMs: 2 * DAY_MS,
    error,
  });
  const perMinute = (key: string, limit = budget.aiCallsPerMinute): Check => ({
    key,
    window: minute,
    limit,
    ttlMs: 5 * 60_000,
    error: slowDown,
  });

  const modelTokens = (model: Pick<ModelConfig, "id" | "label" | "dailyTokens">) =>
    daily(`${MODEL_TOKENS}${model.id}`, model.dailyTokens ?? Infinity, modelAtCapacity(model.label));

  const tokenChecks = [
    daily(`tokens:${candidate}`, budget.tokensPerCandidate, dailyLimit("You've reached today's practice limit. Come back tomorrow!")),
    daily(`tokens:${ip}`, budget.tokensPerIp, dailyLimit("Today's practice limit for your network has been reached. Come back tomorrow!")),
    daily("tokens:global", budget.tokensGlobal, atCapacity),
  ];

  const audioChecks = [
    daily(`audio:${candidate}`, budget.audioSecondsPerCandidate, dailyLimit("You've used today's time for spoken answers. Type your answers for now, or come back tomorrow.")),
    daily(`audio:${ip}`, budget.audioSecondsPerIp, dailyLimit("Today's time for spoken answers on your network is used up. Type your answers for now, or come back tomorrow.")),
    daily("audio:global", budget.audioSecondsGlobal, () =>
      new HttpError(503, "CAPACITY", "Today's free capacity for spoken answers is used up across everyone. Type your answers for now.")
    ),
  ];

  return {
    startInterview: () =>
      charge(
        [
          daily(
            `interviews:${candidate}`,
            budget.interviewsPerCandidate,
            dailyLimit(`You've started ${budget.interviewsPerCandidate} interviews today, which is the daily limit. Come back tomorrow!`)
          ),
          daily(`interviews:${ip}`, budget.interviewsPerIp, dailyLimit("Today's interview limit for your network has been reached. Come back tomorrow!")),
        ],
        1,
        now
      ),
    aiCalls: async (model, calls = 1) => {
      const burst = [perMinute(`ai-minute:${candidate}`), perMinute(`ai-minute:${ip}`)];
      const dailyChecks = model.dailyTokens === undefined ? tokenChecks : [...tokenChecks, modelTokens(model)];
      await ensureRoom([...burst.map((check) => ({ check, amount: calls })), ...dailyChecks.map((check) => ({ check, amount: 1 }))]);
      await add(burst, calls, now);
    },
    // Every model's tokens are counted, capped or not, for the usage report.
    tokens: (count, modelId) => add([...tokenChecks, modelTokens({ id: modelId, label: modelId })], count, now),
    searches: (amount) =>
      charge(
        [
          daily(`searches:${ip}`, budget.searchesPerIp, dailyLimit("Today's research limit for your network has been reached. Come back tomorrow!")),
          daily("searches:global", budget.searchesGlobal, atCapacity),
        ],
        amount,
        now
      ),
    accountAction: () => charge([perMinute(`account-minute:${ip}`, budget.accountActionsPerMinute)], 1, now),
    audioCall: async () => {
      const burst = [perMinute(`ai-minute:${candidate}`), perMinute(`ai-minute:${ip}`)];
      await ensureRoom([...burst.map((check) => ({ check, amount: 1 })), ...audioChecks.map((check) => ({ check, amount: 1 }))]);
      await add(burst, 1, now);
    },
    audioSeconds: (seconds) => add(audioChecks, seconds, now),
    interviewerVoice: async (characters) => {
      const usedUp = () => new HttpError(429, "DAILY_LIMIT", "Today's enhanced interviewer voice is used up. Your browser's voice reads the questions instead.");
      const questions = [
        daily(`voice:${candidate}`, budget.voiceQuestionsPerCandidate, usedUp),
        daily(`voice:${ip}`, budget.voiceQuestionsPerIp, usedUp),
        daily("voice:global", budget.voiceQuestionsGlobal, usedUp),
        { ...perMinute("voice-minute:global", budget.voiceQuestionsPerMinute), error: usedUp },
      ];
      const characterCheck = daily("voice-characters:global", budget.voiceCharactersGlobal, usedUp);
      await ensureRoom([...questions.map((check) => ({ check, amount: 1 })), { check: characterCheck, amount: characters }]);
      await add(questions, 1, now);
      await add([characterCheck], characters, now);
    },
  };
}

// ---- usage report ----

export type UsageCounts = {
  tokens: number;
  searches: number;
  audioSeconds: number;
  /** Questions read by the enhanced interviewer voice, and their characters. */
  voiceQuestions: number;
  voiceCharacters: number;
  /** Tokens per model id. */
  models: Record<string, number>;
  candidates: { id: string; tokens: number; interviews: number }[];
  networks: { network: string; tokens: number; interviews: number; searches: number }[];
};

/**
 * Everything counted on `day` (YYYY-MM-DD, UTC), heaviest users first. Counters are kept two days,
 * so only today and yesterday have data.
 */
export async function usageOn(day: string, top = 50): Promise<UsageCounts> {
  const counters = await CounterModel.find({ window: day }, { key: 1, count: 1 }).lean();
  const usage: UsageCounts = { tokens: 0, searches: 0, audioSeconds: 0, voiceQuestions: 0, voiceCharacters: 0, models: {}, candidates: [], networks: [] };
  const candidates = new Map<string, UsageCounts["candidates"][number]>();
  const networks = new Map<string, UsageCounts["networks"][number]>();
  const candidate = (id: string) => candidates.get(id) ?? candidates.set(id, { id, tokens: 0, interviews: 0 }).get(id)!;
  const network = (id: string) =>
    networks.get(id) ?? networks.set(id, { network: id, tokens: 0, interviews: 0, searches: 0 }).get(id)!;

  for (const { key, count } of counters) {
    // Keys are "<measure>:<subject>:<id>"; ids (models, IPv6 networks) may contain colons themselves.
    const [measure, subject] = key.split(":", 2) as [string, string | undefined];
    const id = key.slice(measure.length + (subject ?? "").length + 2);
    if (key === "tokens:global") usage.tokens = count;
    else if (key === "searches:global") usage.searches = count;
    else if (key === "audio:global") usage.audioSeconds = count;
    else if (key === "voice:global") usage.voiceQuestions = count;
    else if (key === "voice-characters:global") usage.voiceCharacters = count;
    else if (subject === "model" && measure === "tokens") usage.models[id] = count;
    else if (subject === "candidate" && (measure === "tokens" || measure === "interviews")) candidate(id)[measure] = count;
    else if (subject === "ip" && (measure === "tokens" || measure === "interviews" || measure === "searches")) network(id)[measure] = count;
  }
  const heaviest = <T extends { tokens: number; interviews: number }>(rows: T[]) =>
    rows.sort((a, b) => b.tokens - a.tokens || b.interviews - a.interviews).slice(0, top);
  usage.candidates = heaviest([...candidates.values()]);
  usage.networks = heaviest([...networks.values()]);
  return usage;
}
