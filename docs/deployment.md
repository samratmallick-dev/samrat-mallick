# Production deployment (Render + Vercel)

| Part | Platform | Config |
| --- | --- | --- |
| Frontend | Vercel (static) | `frontend/vercel.json`, Vercel env vars |
| Backend API | Render Web Service | `render.yaml` (Blueprint) |
| Database | MongoDB Atlas | `MONGO_URL` + `MONGO_NAME` |
| Media | Cloudinary | `CLOUD_*` |
| Email / OTP | Gmail API | `GMAIL_*` |
| Deploy trigger | GitHub Actions | `.github/workflows/deploy.yml` |
| Keep-alive | GitHub Actions | `.github/workflows/keep-alive.yml` |

---

## 1. Push to GitHub

The repo's `origin` is `https://github.com/samratmallick-dev/samrat-mallick.git` and the
default branch is `main`. Behind-the-scenes config changes only take effect after a push.

## 2. Deploy the Render Blueprint

Render Dashboard → **New → Blueprint** → connect the repo → select `main`.
Render reads `render.yaml` from the repo root and prompts for the `sync: false` values.

**Values you must provide:**

| Variable | Notes |
| --- | --- |
| `MONGO_URL` | Cluster URI **without** a database name, e.g. `mongodb+srv://user:pass@cluster.mongodb.net`. The code appends `/MONGO_NAME` (`config.db.js`). |
| `MONGO_NAME` | Defaults to `myportfolio` in the Blueprint. |
| `ALLOWED_ORIGINS` | Comma-separated browser origins, e.g. `https://your-site.vercel.app`. No trailing slash. |
| `CLIENT_URL` | Same list as above (used by CORS config). |
| `ADMIN_BOOTSTRAP_SECRET` | Min. 24 chars. Needed only for step 4. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
| `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` | Required at startup — the Cloudinary module throws if they are missing. |
| `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER` | Contact form + OTP emails. |

**Auto-generated / preset:** `JWT_ACCESS_SECRET` (Render generates a 256-bit value),
`JWT_ISSUER`, `JWT_AUDIENCE`, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, `NODE_ENV=production`.

`healthCheckPath: /health` is set, and `npm ci` / `npm start` are used from `rootDir: backend`.

## 3. Add GitHub Actions secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Where to get it |
| --- | --- |
| `RENDER_DEPLOY_HOOK_URL` | Render service → **Settings → Deploy Hook** |
| `RENDER_HEALTH_URL` | `https://<your-service>.onrender.com/health` |

`render.yaml` sets `autoDeployTrigger: 'off'`, so `deploy.yml` is the **only** deploy path for
`backend/**`, `render.yaml`, and its own file changes. Frontend changes are deployed by Vercel.

> Prefer Render's native Git auto-deploy? Set `autoDeployTrigger: 'commit'` in `render.yaml`
> and delete/disable `.github/workflows/deploy.yml` so pushes don't deploy twice.

## 4. Bootstrap the first admin (once)

```bash
curl -X POST https://<your-service>.onrender.com/api/v1/admin/bootstrap \
  -H "Content-Type: application/json" \
  -H "X-Admin-Bootstrap-Secret: <ADMIN_BOOTSTRAP_SECRET>" \
  -d '{"username":"admin","email":"you@example.com","password":"a-strong-password"}'
```

The endpoint permanently disables itself after the first admin is created (409 afterwards).

## 5. Configure Vercel (frontend)

In the Vercel project → **Settings → Environment Variables**:

```
VITE_API_BASE_URL=https://<your-service>.onrender.com/api/v1
```

`VITE_API_BASE_URL_LOCAL` is only used in dev (defaults to `http://localhost:8000`).
`VITE_SOCKET_URL` is optional: in production the socket URL is derived from
`VITE_API_BASE_URL` automatically (origin only, e.g. `https://<service>.onrender.com`) —
set it explicitly only if your Socket.io server lives at a different origin.

Then redeploy the frontend. Add the Vercel domain (and any custom domain) to
`ALLOWED_ORIGINS` / `CLIENT_URL` in Render, otherwise CORS and the refresh cookie will fail.

---

## Free-instance sleep and keep-alive

Free Render web services spin down after ~15 minutes without inbound traffic; the next
request waits through a cold start (~30–60s). `keep-alive.yml` pings `/health` every
10 minutes to prevent that.

- **Keep-alive must be external.** A timer inside the Node process stops when the instance sleeps.
- Render's **Health Check** (`healthCheckPath`) only detects/restarts unhealthy services; it does **not** keep them awake.
- **Cheaper/more reliable alternative:** a free UptimeRobot (or cron-job.org) HTTP monitor every 5 minutes pointing at `/health`. GitHub scheduled runs can be delayed, and frequent runs consume Actions minutes on private repositories. If you use an external monitor, delete/disable `.github/workflows/keep-alive.yml`.
- **No sleep at all:** change `plan: free` to `plan: 0.5c-512mb` (Starter) in `render.yaml`, re-sync the Blueprint, and you can drop the keep-alive workflow.
- Socket.io/SSE connections drop when an instance sleeps — the client reconnects automatically; allow for the cold start on the first load.

## Verify

1. `GET https://<service>.onrender.com/health` → `{"status":"healthy",...}`
2. GitHub Actions: keep-alive and deploy runs green.
3. Admin login from the Vercel domain works (cross-site cookie + CORS).
4. Push a backend change → deploy workflow triggers a Render deploy.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `CORS blocked: <origin>` | Add the exact Vercel/custom origin (no trailing slash) to `ALLOWED_ORIGINS` and `CLIENT_URL`, then re-sync the Blueprint. |
| Refresh cookie not sent / 401 loops | Requires HTTPS + `COOKIE_SECURE=true` + `COOKIE_SAME_SITE=none` and an allowed origin. |
| `Cloudinary configuration is missing` | Set all three `CLOUD_*` variables in Render. |
| `MONGO_URL is not defined` / connection fails | Set `MONGO_URL` and keep `MONGO_NAME`; don't put the DB name in `MONGO_URL`. |
| Health check failing / deploy never healthy | Check Render logs; `PORT` is injected by Render (no hard-coded port needed). |
| Deploy workflow not running | Check the `push` path filter (`backend/**`, `render.yaml`) and that the secret exists. |
