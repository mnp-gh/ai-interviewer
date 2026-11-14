# Self-hosted images (see "Deploying" in the Readme), built from the repo root with this file. Two targets:
#   server: the Fastify API on port 8080
#   web:    Nginx serving the built client and proxying /api to the server (HTTPS is the host's job)
# Docker Hardened Images: run `docker login dhi.io` with a Docker Hub account first. The runtime images
# run as non-root and have no shell or package manager, so everything is installed in the -dev stages.
FROM dhi.io/node:24-dev AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY client/package.json client/
COPY server/package.json server/
RUN pnpm install --frozen-lockfile

FROM deps AS client-build
COPY client client
# The client imports the server's schemas type-only, so the build needs the server sources too.
COPY server server
# Read at build time: rebuild the web image after changing it.
ARG VITE_TURNSTILE_SITE_KEY=
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY
RUN pnpm --filter client build

FROM base AS server-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY server/package.json server/
# Dev dependencies included: the server runs its TypeScript with tsx, as `pnpm start` does locally.
RUN pnpm install --frozen-lockfile --filter server

FROM dhi.io/node:24 AS server
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
WORKDIR /app
COPY --from=server-deps /app ./
COPY server/src server/src
WORKDIR /app/server
EXPOSE 8080
CMD ["node", "--import", "tsx", "src/index.ts"]

FROM dhi.io/nginx:1 AS web
# A complete nginx.conf: the image runs as non-root, so it listens on 8080 and keeps its files in /tmp.
COPY deploy/web.conf /etc/nginx/nginx.conf
COPY --from=client-build /app/client/dist /usr/share/nginx/html
EXPOSE 8080
