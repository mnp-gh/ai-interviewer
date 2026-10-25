import type { FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

// Candidates are anonymous: the server gives each browser a random UUID in an HttpOnly cookie,
// so page scripts can't read it. Saving it with a passkey or recovery code is how history follows them.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CANDIDATE_COOKIE = "candidate";
/** Before the cookie, browsers kept the id in localStorage and sent it here; adopted once, then ignored. */
export const LEGACY_CANDIDATE_HEADER = "x-candidate-id";

const COOKIE_MAX_AGE_S = 400 * 24 * 60 * 60; // the longest browsers allow

const candidates = new WeakMap<FastifyRequest, string>();

export const header = (request: FastifyRequest, name: string) => {
  const value = request.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const valid = (id: string | undefined): id is string => !!id && UUID.test(id);

// Set as a plain header rather than with reply.setCookie, which only writes cookies when Fastify
// sends the reply: streamed replies bypass that, and copy the reply's headers instead (see ndjson.ts).
const writeCookie = (reply: FastifyReply, value: string, maxAge: number) =>
  reply.header(
    "set-cookie",
    reply.server.serializeCookie(CANDIDATE_COOKIE, value, {
      path: "/api",
      httpOnly: true,
      sameSite: "strict",
      secure: !!process.env.PUBLIC_ORIGIN, // local development is plain http
      maxAge,
    })
  );

export const setCandidateCookie = (reply: FastifyReply, id: string) => writeCookie(reply, id, COOKIE_MAX_AGE_S);

export const clearCandidateCookie = (reply: FastifyReply) => writeCookie(reply, "", 0);

/**
 * preHandler hook: identifies the candidate, giving a new browser an id. `mayAdoptLegacy` says
 * whether a legacy id may be taken over: a saved history must be restored with its passkey or
 * recovery code, never by just presenting its id.
 */
export function requireCandidate(mayAdoptLegacy: (id: string) => Promise<boolean>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const cookie = request.cookies[CANDIDATE_COOKIE];
    if (valid(cookie)) {
      candidates.set(request, cookie.toLowerCase());
      return;
    }
    const legacy = header(request, LEGACY_CANDIDATE_HEADER)?.toLowerCase();
    const id = valid(legacy) && (await mayAdoptLegacy(legacy)) ? legacy : randomUUID();
    setCandidateCookie(reply, id);
    candidates.set(request, id);
  };
}

export function candidateId(request: FastifyRequest): string {
  const id = candidates.get(request);
  if (!id) throw new Error("requireCandidate hook is missing");
  return id;
}

/**
 * The client's IP. Behind the reverse proxy, CLIENT_IP_HEADER names the header the proxy overwrites
 * with the client's address (the server must only be reachable through that proxy). Elsewhere (local
 * dev) we use the socket address and ignore client-supplied forwarding headers.
 */
export function clientIp(request: FastifyRequest): string {
  const proxyHeader = process.env.CLIENT_IP_HEADER?.toLowerCase();
  const forwarded = proxyHeader && header(request, proxyHeader);
  const first = forwarded?.split(",")[0]?.trim();
  return first || (request.raw.socket.remoteAddress ?? "unknown");
}

