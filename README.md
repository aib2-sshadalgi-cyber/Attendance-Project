# Campus Biometric Attendance Desk

Production-oriented monolithic repo with a facial descriptor pipeline (aligned with **[face-api.js](https://github.com/justadudewhohacks/face-api.js)**) over **React + Express + Supabase Postgres** (via `pg`).

## Highlights

- One successful attendance capture per learner per lecture; duplicate scans return `👉 "Scanned for (Subject Name) Lecture"`.
- JWT-based RBAC separating **administrator** workloads (registrar, timetable, telemetry) vs **student** interactions.
- Vercel-friendly API shim (`/api`) that reuses the same Express surface area as traditional Node hosting.
- Optional `DISABLE_FACE_VERIFY=true` strictly for scripted demos/trial halls without camera fidelity.

```
/project-root
├── frontend/           # React (Vite) + Tailwind + face descriptors in-browser
├── backend/            # Express + Postgres (Supabase) + JWT + Euclidean face matching
├── api/index.js        # Vercel serverless bridge (connects DB per invocation)
├── supabase/migrations # SQL schema to run once in Supabase SQL Editor
├── vercel.json         # SPA rewrites & function bundling directives
├── package.json        # npm workspaces orchestrator
└── README.md
```

---

## Prerequisites

- Node.js 18+
- A **Supabase** project (or any Postgres) with `DATABASE_URL` (transaction pooler URI recommended).
- HTTPS-capable browsers for `getUserMedia` (Safari/WebKit quirks may require HTTPS even on LAN).

Face weights download automatically via CDN fallback; optionally mirror them under `frontend/public/models` for air-gapped networks.

---

## Local development

### 1. Install dependencies from the workspace root

```bash
npm install
```

### 2. Configure environment files

Duplicate the samples:

```bash
copy backend\.env.example backend\.env        # PowerShell / Windows CMD users
# or
cp backend/.env.example backend/.env         # macOS / Linux
```

Run **`supabase/migrations/001_attendance_schema.sql`** in the Supabase SQL Editor (creates tables). Then set **`DATABASE_URL`**, **`JWT_SECRET`**, and optional tuning (`FACE_MATCH_THRESHOLD`, `DISABLE_FACE_VERIFY`) in `backend/.env`.

Frontend dev proxies `/api` → `localhost:5000`, so **`VITE_API_URL` may stay blank** locally.

### 3. Bootstrap reference data

```bash
npm run seed
```

Seeded personas:

| Role     | Email                 | Password     |
| -------- | --------------------- | ------------ |
| Admin    | admin@college.edu     | `Admin@123`  |
| Students | alice@student.edu …   | `Student@123`|

Faces are **empty** until an admin executes **Register face** inside the SPA (or you flip bypass mode).

### 4. Launch both tiers concurrently

```bash
npm run dev
```

Defaults:

| Surface        | URL                    |
| -------------- | ---------------------- |
| React client   | `http://localhost:5173` |
| Express API    | `http://localhost:5000` |

Operational smoke test:

1. Sign in as **admin**, create / confirm seeded subjects & lectures remain active.
2. Open **Students → Register face** for Alice with a webcam.
3. Impersonate **Alice**, select the live lecture slot, capture face → expect `201 Created`.
4. Repeat scan → informational banner quoting _Scanned for (Subject)_.

---

## Production builds

Frontend static bundle:

```bash
npm run build -w frontend
```

Standalone API container / VM:

```bash
NODE_ENV=production npm run start -w backend
```

Remember to tighten `CORS_ORIGIN`, rotate `JWT_SECRET`, and keep `DISABLE_FACE_VERIFY=false`.

---

## Deploying to Vercel (full stack blueprint)

### Single project topology

1. Import this repository.
2. Framework preset stays **Other** — `vercel.json` already defines `buildCommand`, `outputDirectory`, and serverless bindings.
3. Wire environment variables in the Vercel dashboard:
   - `DATABASE_URL` (Supabase **transaction pooler** connection string; keep `sslmode=require`)
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `FACE_MATCH_THRESHOLD`
   - `DISABLE_FACE_VERIFY` (`false`)
   - `CORS_ORIGIN=https://YOUR_VERCEL_PROJECT.vercel.app` (comma-separate multiples if needed).

4. **Important:** In Supabase, ensure the DB accepts connections from Vercel (pooler is IPv4-friendly). Apply the migration SQL to production if tables are not there yet.

Because Vercel functions are ephemeral, realtime admin dashboards use **polling (5 s)** — upgrade to sockets on a persistent host when sub-second SLA is mandated.

---

## Split deployments (alternative)

Organizations that prefer deterministic Node processes can ship:

- Frontend → **Vercel** / Netlify (`VITE_API_URL=https://api.your-campus.edu`).
- Backend → Railway / Fly.io / ECS / hardened VM executing `npm run start -w backend`.

Update `frontend/.env` with the remote API prefix.

---

## Security & Compliance Notes

Facial embeddings are numerical tensors — treat them as sensitive PII. Mitigations baked into this reference:

- Transport via TLS in production builds.
- Per-lecture duplicate guard + Euclidean threshold checks configurable through environment variables.
- Optional bypass flag exists **only for smoke tests**.

Always consult institutional IRB/ethics frameworks before biometric production rollouts.

---

## Troubleshooting

| Symptom                         | Resolution                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| React cannot reach `/api/*` dev | Confirm backend process + Vite proxy.                                                                   |
| `Face models failed…` network   | Download weights into `frontend/public/models`.                                                          |
| `Face does not match`           | Re-register indoors with frontal lighting / adjust `FACE_MATCH_THRESHOLD`.                              |
| Vercel 500 bootstrap            | Double-check `DATABASE_URL`, JWT secret, and that migration SQL ran on the Supabase project.          |

Happy shipping ☀️ Build issues? Inspect server logs (`morgan`), browser network panel, or temporarily enable `DISABLE_FACE_VERIFY=true`.
