# Host on one VM with Docker, API under /api

The site and the API run as two containers on a free Oracle Cloud VM (Ampere, arm64): the API (`server`) and an Nginx container (`web`) that serves the built client and proxies `/api` to the API. The VM's own Nginx terminates HTTPS with a Certbot certificate and forwards everything to the web container on localhost. Locally, Vite proxies `/api` to the server. Sharing one origin removes CORS entirely (other websites' pages can't call the API), removes the need for an API URL in the client, and keeps one deployment.

GitHub Actions deploys every push to `main`: it runs the checks, builds both images on an arm64 runner, pushes them to GHCR tagged with the commit, and has the VM pull and restart them. Images are immutable per commit, so rerunning an older deploy rolls back. The VM holds only configuration (`docker-compose.yml` and two env files).

A long-running server suits the app: one MongoDB connection pool, no cold starts, and no time limit on streamed replies or PDF parsing.

## Considered options

- **Cloudflare (Workers; Pages is now Workers):** Node HTTP servers run there, but MongoDB isn't supported by Hyperdrive (Postgres/MySQL only), so every request opens a new connection (~300 ms); Mongoose 9 would be required; and PDF parsing likely exceeds the free plan's 10 ms CPU limit. Worth revisiting if we move to Postgres or pay for Workers ($5/month).
- **Render:** a natural fit for a long-running Node server, but the free plan sleeps after 15 minutes idle and takes about a minute to wake, and Render advises against it for production. Worth revisiting on its paid plan (about $7/month).
- **Caddy for the web container:** its main draw, automatic HTTPS, is the host Nginx's job here, so one web server everywhere won.
- **Building images on the VM:** simpler (no registry), but it ties up the VM's two cores for minutes on every deploy and gives no per-commit images to roll back to.
