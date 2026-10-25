# AI Interviewer

Practise a job interview with an AI interviewer tailored to your resume and the job you want, and get honest coaching on every answer.

## What it does

1. **Setup.** Upload your resume (PDF or text) and paste the job description. The AI extracts your **candidate profile** and the **role requirements**, which you review and edit, shows how you **match**, and researches the company and role on the web for a **role briefing** with sources. Pick the interview type, difficulty, length, mode and interviewer model.
2. **Interview.** Questions stream in, tailored to you, the role and your earlier answers; about a third draw on the role briefing.
   - **Coach mode:** feedback after each answer, and you can ask the coach about it or try the question again.
   - **Mock mode:** like the real thing, with feedback only in the report.
3. **Report.** An overall score, a score and note for each question, what a strong answer would have included, strengths, and what to work on next.
4. **History.** Reopen a report, resume an interview, practise again with the same setup, or delete. Save your history with a **passkey** or a **recovery code** to open it in another browser or after clearing your browsing data.

No sign-up and no email: each browser gets an anonymous id. Everything runs on free AI tiers (Groq by default, optionally Mistral, Gemini and OpenRouter), protected by a bot check and usage budgets.

## Architecture

```
client/   React 19 + Vite + MUI, React Query, React Router
server/   Fastify API (TypeScript), Mongoose (MongoDB Atlas), OpenAI-compatible SDK for every AI provider
deploy/   Dockerfile, Compose file and Nginx configs (Docker deployment)
```

- **One origin.** In production an Nginx container serves the static client and proxies the API under `/api`; locally Vite proxies `/api` to the server on port 8080. No CORS.
- **One document per interview** (setup, turns, report) in MongoDB, with atomic conditional updates guarding against double submits.
- **Streaming** as NDJSON over POST for questions, feedback and coach replies.
- **Types shared** by importing the server's zod schemas type-only from the client.

Key paths:

| Path | What's there |
|---|---|
| `server/src/interview/` | Domain schemas, prompts, the interview service, the Mongo model |
| `server/src/ai/` | Model registry (the one file to edit when free models change) and the AI client |
| `server/src/research/` | Web search (Tavily) and role briefings |
| `server/src/usage/meter.ts` | Usage budgets and caps |
| `server/src/http/` | Candidate id, bot check, security headers, errors, NDJSON streaming |
| `client/src/pages/` | Home and history, setup wizard, interview room, report |

## Getting started

Requires **Node 24+** and **pnpm 10**. With nvm: `nvm use` (reads `.nvmrc`), then `corepack enable` so `pnpm` is the pinned version. `pnpm` refuses to run on older Node (`engine-strict`); to make 24 your default, `nvm alias default 24`.

```sh
pnpm install
cp server/.env.example server/.env   # fill in MONGODB_URI and GROQ_API_KEY at minimum
cp client/.env.example client/.env   # optional: Turnstile site key
pnpm dev                             # http://localhost:5173 (API on :8080)
```

Optional keys in `server/.env` switch features on: `MISTRAL_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` (more models), `TAVILY_API_KEY` (role briefing), `TURNSTILE_SECRET_KEY` (bot check). `server/.env.example` documents every variable, including the usage budgets. Environment files are read at startup, so restart `pnpm dev` after editing them.

| Command | Does |
|---|---|
| `pnpm dev` | Client and server with reload |
| `pnpm test` | Server tests (fake AI, in-memory MongoDB) and client tests (jsdom) |
| `pnpm typecheck` / `pnpm lint` / `pnpm build` | Across both packages |

Tests never call real AI providers. The first server test run downloads a MongoDB binary for the in-memory database.

## Deploying

`deploy/docker-compose.yml` runs two containers, built from `deploy/Dockerfile` on [Docker Hardened Images](https://docs.docker.com/dhi/) (non-root, no shell): the API (`server`) and Nginx (`web`, configured by `deploy/web.conf`), which serves the built client and proxies `/api` to the API, on `127.0.0.1:8081`. The host's Nginx terminates HTTPS (Certbot) and forwards everything to it, so the site and API share one origin. These steps assume a VM that already has Docker Compose, Nginx (allowed by SELinux to proxy), Certbot and firewalld open for HTTP and HTTPS, such as the Oracle Cloud free-tier VM. The OCI Security List must also allow TCP 80 and 443.

Pushing to `main` deploys (see [Continuous deployment](#continuous-deployment)). All configuration lives in GitHub; each deploy writes it to the server, which holds nothing else:

```
~/ai-interviewer/
  deploy/docker-compose.yml   copied by each deploy
  deploy/.env                 SITE_ADDRESS, written by each deploy
  server/.env                 the server's variables, written by each deploy
```

1. **Pick the site's hostname** and point its DNS at the server: a domain, a free subdomain such as DuckDNS, or `<ip with dashes>.sslip.io` (a VM at `203.0.113.9` is `203-0-113-9.sslip.io`).
2. **Point Nginx at the containers and add HTTPS** (from a checkout, for `deploy/nginx.conf`):

   ```sh
   sudo cp deploy/nginx.conf /etc/nginx/conf.d/ai-interviewer.conf
   sudo sed -i "s/example.com/<SITE_ADDRESS>/" /etc/nginx/conf.d/ai-interviewer.conf
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d <SITE_ADDRESS> --redirect
   ```

3. **Deploy** by pushing to `main`, or run the workflow by hand (Actions → CI/CD → Run workflow). `docker compose logs -f` in `~/ai-interviewer/deploy` shows the logs.

Without CI, `docker login dhi.io` (a Docker Hub account) and then `docker compose up -d --build` in `deploy/`, with `deploy/.env` (see `deploy/.env.example`) and `server/.env`, builds and starts the same containers.

Server variables (secrets in the `production` environment; see [Continuous deployment](#continuous-deployment)):

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Atlas connection string |
| `GROQ_API_KEY` | yes | Default and parsing model |
| `TURNSTILE_SECRET_KEY` | recommended | Bot check; pair it with `VITE_TURNSTILE_SITE_KEY` |
| `TAVILY_API_KEY` | optional | Role briefing |
| `MISTRAL_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` | optional | More models |
| `ADMIN_TOKEN` | optional | Turns on the `/admin` usage page |
| `DAILY_TOKENS`, `DAILY_SEARCHES`, ... | optional | Budgets; defaults in `server/.env.example` |

**Before inviting users**, work through the release checklist in [docs/security.md](docs/security.md).

Also:

- **Atlas network access.** Allow the VM's public IP (reserve it in OCI so it never changes) instead of `0.0.0.0/0`.
- **Turnstile.** Add `SITE_ADDRESS` to the widget's hostnames in Cloudflare.
- **Passkeys belong to `SITE_ADDRESS`.** Passkeys saved on another domain don't work there; recovery codes do. Pick the name once.
- **Sharing the server with other apps.** This app owns the Compose project `ai-interviewer`, host port `127.0.0.1:8081` and its own Nginx site, and deploys only remove its own images. Another app needs its own port, `server_name` (e.g. `api.<ip with dashes>.sslip.io`) and certificate.
- **Only localhost reaches the containers.** The API trusts the `X-Real-IP` header Nginx sets, so keep port 8081 bound to `127.0.0.1` and never publish 8080.

### Continuous deployment

`.github/workflows/deploy.yml` lints, typechecks and tests every push and pull request. On `main` it then builds both images on an arm64 runner, pushes them to GHCR tagged with the commit, and over SSH has the server pull them, restart and pass a health check. To roll back, rerun an older run's **deploy** job: it deploys that commit's images.

All configuration lives in the repository's `production` environment (Settings → Environments → production). Each deploy writes the server's `deploy/.env` and `server/.env` from it, so to change a setting, edit it there and run the workflow (Actions → CI/CD → Run workflow).

| Kind | Name | Value |
|---|---|---|
| Variable | `SITE_ADDRESS` | The site's hostname, e.g. `ai-interviewer-mnp.duckdns.org`; passkeys belong to it |
| Secrets and variables | Every server variable (`MONGODB_URI`, `GROQ_API_KEY`, `TURNSTILE_SECRET_KEY`, `DAILY_TOKENS`, ...) | Copied to `server/.env` as they are: secrets for keys, variables for plain settings. A new one needs no workflow change |
| Repository secrets | `DHI_USERNAME`, `DHI_TOKEN` | A Docker Hub username and access token (read-only) for pulling the Docker Hardened base images |
| Secret | `DEPLOY_SSH_KEY` | A private key used only for deploys, whose public key is in the server user's `~/.ssh/authorized_keys` |
| Secret | `DEPLOY_KNOWN_HOSTS` | The server's host key line, e.g. from `ssh-keygen -F <host>` on a machine that has connected before |
| Variable | `DEPLOY_HOST` | The server's IP or hostname |
| Variable | `DEPLOY_USER` | A user in the `docker` group (`opc` on Oracle Linux) |
| Variable | `DEPLOY_PATH` | `/home/opc/ai-interviewer` |

To set many at once, put them in `.env.production` at the repo root (git-ignored, `server/.env` syntax) and run `deploy/github-config.sh`: it makes keys secrets, plain settings variables, `DHI_*` repository secrets and `VITE_*` repository variables.

Names starting with `DEPLOY_`, `DHI_` or `VITE_` stay out of `server/.env`. The Turnstile site key is a **repository** variable (Settings → Secrets and variables → Actions → Variables), `VITE_TURNSTILE_SITE_KEY`, because the image build reads it; it's public. Values must fit on one line.

## Documentation

- [Decisions](docs/decisions.md): every product and technical decision, and why
- [Decision records](docs/adr/): the bigger, harder-to-reverse choices in more depth
- [Security](docs/security.md): abuse protection, known limits, and the release checklist
- [Glossary](GLOSSARY.md): the domain vocabulary used in code and docs
- [AGENTS.md](AGENTS.md): conventions for AI coding agents working in this repo
