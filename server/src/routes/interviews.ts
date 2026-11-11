import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { AUDIO_TYPES, baseAudioType } from "../ai/speech";
import { requireHuman, type VerifyHuman } from "../http/botcheck";
import { candidateId, clientIp } from "../http/candidate";
import { streamNdjson } from "../http/ndjson";
import { HttpError } from "../http/errors";
import { pauseNewWork } from "../http/security";
import { MAX_ANSWER_CHARS, MAX_COACH_MESSAGE_CHARS, setupSchema } from "../interview/schemas";
import { toSummary, toView, type InterviewService } from "../interview/service";
import { createMeter, type Budget } from "../usage/meter";

export type InterviewRoutesOptions = {
  service: InterviewService;
  budget: Budget;
  verifyHuman: VerifyHuman | null;
  now?: () => Date;
};

type WithId = { Params: { id: string } };

/** Far above two minutes of speech in any browser's format; the proxies allow 5 MB bodies. */
export const MAX_RECORDING_BYTES = 4 * 1024 * 1024;

export const interviewRoutes: FastifyPluginAsync<InterviewRoutesOptions> = async (
  app,
  { service, budget, verifyHuman, now = () => new Date() }
) => {
  const meter = (req: FastifyRequest) => createMeter(budget, { candidateId: candidateId(req), ip: clientIp(req) }, now());
  /** New work: paused in maintenance, and only for humans. */
  const startsWork = { preHandler: [pauseNewWork(), requireHuman(verifyHuman)] };

  // Only this plugin accepts audio; recordings are kept (ADR 0011), so their bytes go to the service.
  app.addContentTypeParser(/^audio\//, { parseAs: "buffer", bodyLimit: MAX_RECORDING_BYTES }, (_req, body, done) =>
    done(null, body)
  );

  app.get("/", async (req) => {
    const docs = await service.list(candidateId(req));
    return { interviews: docs.map(toSummary) };
  });

  app.post("/", startsWork, async (req, reply) => {
    const setup = setupSchema.parse(req.body);
    await meter(req).startInterview();
    const doc = await service.create(candidateId(req), setup);
    return reply.code(201).send({ interview: toView(doc) });
  });

  app.get<WithId>("/:id", async (req) => ({ interview: toView(await service.get(candidateId(req), req.params.id)) }));

  app.delete<WithId>("/:id", async (req, reply) => {
    await service.remove(candidateId(req), req.params.id);
    return reply.code(204).send();
  });

  /** Practise again: a new interview with the same setup. */
  app.post<WithId>("/:id/retake", startsWork, async (req, reply) => {
    const { id } = req.params;
    await service.get(candidateId(req), id); // 404 before counting against the limit
    await meter(req).startInterview();
    const doc = await service.retake(candidateId(req), id);
    return reply.code(201).send({ interview: toView(doc) });
  });

  app.put<WithId>("/:id/model", async (req) => {
    const { modelId } = z.object({ modelId: z.string().min(1) }).parse(req.body);
    return { interview: toView(await service.switchModel(candidateId(req), req.params.id, modelId)) };
  });

  app.post<WithId>("/:id/questions", async (req, reply) => {
    await streamNdjson(reply, async (onDelta) =>
      toView(await service.nextQuestion(candidateId(req), req.params.id, onDelta, meter(req)))
    );
    return reply;
  });

  app.post<WithId>("/:id/answers", async (req, reply) => {
    const { answer, spoken } = z
      .object({
        answer: z.string().trim().min(1, "Write an answer first").max(MAX_ANSWER_CHARS),
        /** The answer is the unsent recording's transcription, as corrected. */
        spoken: z.boolean().optional(),
      })
      .parse(req.body);
    await streamNdjson(reply, async (onDelta) =>
      toView(await service.answer(candidateId(req), req.params.id, answer, onDelta, meter(req), spoken))
    );
    return reply;
  });

  /** Spoken interviews: transcribes a recorded answer and keeps it until the answer is sent. */
  app.post<WithId>("/:id/recordings", async (req) => {
    const type = baseAudioType(req.headers["content-type"] ?? "");
    if (!AUDIO_TYPES[type] || !Buffer.isBuffer(req.body) || !req.body.length) {
      throw new HttpError(415, "UNSUPPORTED_FILE", "That recording's format isn't supported. Type your answer instead.");
    }
    return { interview: toView(await service.record(candidateId(req), req.params.id, req.body, type, meter(req))) };
  });

  /** Spoken interviews: throws away the unsent recording. */
  app.delete<WithId>("/:id/recordings/pending", async (req) => ({
    interview: toView(await service.discardRecording(candidateId(req), req.params.id)),
  }));

  app.get<{ Params: { id: string; recordingId: string } }>("/:id/recordings/:recordingId", async (req, reply) => {
    const { audio, mimeType } = await service.recording(candidateId(req), req.params.id, req.params.recordingId);
    reply.type(mimeType).header("Cache-Control", "private, max-age=86400").header("Accept-Ranges", "bytes");
    // Players fetch byte ranges to seek; without them, Chrome can't jump around in a recording.
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    if (!range || (!range[1] && !range[2])) return reply.send(audio);
    const last = audio.length - 1;
    const start = range[1] ? Number(range[1]) : Math.max(0, audio.length - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), last) : last;
    if (start > end || start > last) {
      return reply.code(416).header("Content-Range", `bytes */${audio.length}`).send();
    }
    return reply.code(206).header("Content-Range", `bytes ${start}-${end}/${audio.length}`).send(audio.subarray(start, end + 1));
  });

  /** Spoken interviews: a question read by the enhanced voice. Over its limits, the client uses the browser's voice. */
  app.get<{ Params: { id: string; index: string }; Querystring: { voice?: string } }>("/:id/questions/:index/speech", async (req, reply) => {
    const index = z.coerce.number().int().min(0).parse(req.params.index);
    const voice = z.string().min(1).parse(req.query.voice);
    const audio = await service.questionSpeech(candidateId(req), req.params.id, index, voice, meter(req));
    // A question never changes, so the browser can replay it without spending the quota again.
    return reply.type("audio/wav").header("Cache-Control", "private, max-age=86400").send(audio);
  });

  app.put<WithId>("/:id/speech-model", async (req) => {
    const { speechModelId } = z.object({ speechModelId: z.string().min(1) }).parse(req.body);
    return { interview: toView(await service.switchSpeechModel(candidateId(req), req.params.id, speechModelId)) };
  });

  app.post<WithId>("/:id/feedback", async (req, reply) => {
    await streamNdjson(reply, async (onDelta) =>
      toView(await service.retryFeedback(candidateId(req), req.params.id, onDelta, meter(req)))
    );
    return reply;
  });

  /** Coach mode: answer the latest question again. */
  app.post<WithId>("/:id/retry", async (req) => ({ interview: toView(await service.retry(candidateId(req), req.params.id)) }));

  /** Coach mode: ask the coach about the feedback on the latest answer. */
  app.post<WithId>("/:id/coach", async (req, reply) => {
    const { message } = z
      .object({ message: z.string().trim().min(1, "Write a message first").max(MAX_COACH_MESSAGE_CHARS) })
      .parse(req.body);
    await streamNdjson(reply, async (onDelta) =>
      toView(await service.askCoach(candidateId(req), req.params.id, message, onDelta, meter(req)))
    );
    return reply;
  });

  app.post<WithId>("/:id/end", async (req) => ({
    interview: toView(await service.end(candidateId(req), req.params.id, meter(req))),
  }));
};
