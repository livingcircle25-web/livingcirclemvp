# Deploying Living Circle

The app has two parts that deploy separately:

- **Frontend** (Expo web static export) → **Vercel**
- **Backend** (FastAPI + MongoDB + DeepFace) → **Railway**
- **Database** → **MongoDB Atlas** (local `mongodb://localhost:27017` won't be reachable once the backend is hosted)

Vercel alone cannot host the backend — it's a serverless platform with request-time and deployment-size limits that TensorFlow/DeepFace/OpenCV blow past. Railway runs a persistent container, which is what this backend needs. `backend/railway.json` and `backend/nixpacks.toml` are already set up for it.

## 1. MongoDB Atlas

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user (username + password).
3. Network Access → allow access from anywhere (`0.0.0.0/0`), since Railway's outbound IP isn't fixed on the free tier.
4. Copy the connection string (`mongodb+srv://...`). This becomes `MONGO_URL` below.

## 2. Backend → Railway

1. Create a new Railway project, deploy from the GitHub repo, root directory `backend/`.
2. Railway auto-detects `nixpacks.toml` (Python 3.11) and `railway.json` (start command + `/api/health` healthcheck).
3. Set these environment variables in Railway's dashboard:

   | Variable | Value |
   |---|---|
   | `MONGO_URL` | Atlas connection string from step 1 |
   | `DB_NAME` | `living_circle` |
   | `JWT_SECRET` | a new random secret — **do not reuse the local-dev value in `backend/.env`** |
   | `CORS_ORIGINS` | your Vercel URL once known, e.g. `https://living-circle.vercel.app` (comma-separated if multiple) |
   | `BREVO_API_KEY` | from Brevo dashboard (same value as local `.env` works, or issue a separate prod key) |
   | `FROM_EMAIL` | `livingcircle25@gmail.com` |
   | `FROM_NAME` | `Living Circle` |
   | `FACE_RECOGNITION_MODEL` | `Facenet512` |
   | `FACE_MATCH_APPROVE_THRESHOLD` | `85` |
   | `FACE_MATCH_PENDING_THRESHOLD` | `70` |
   | `FACE_BLUR_THRESHOLD` | `60` |

   Generate a fresh `JWT_SECRET` with:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

4. Deploy, then confirm `https://<your-app>.up.railway.app/api/health` returns `200`.

**Heads-up:** TensorFlow + DeepFace + OpenCV is a heavy dependency stack (~1–2GB installed). Railway's free/hobby tier has build-time and image-size limits — if the build fails or times out, check Railway's plan limits first; this is a real risk with this stack, not a config bug to chase.

Optional cleanup: `backend/requirements.txt` includes dev-only tools (`pytest`, `black`, `isort`, `flake8`, `mypy`). They add some install time on every Railway build but are small compared to TensorFlow — not worth splitting into a separate `requirements-dev.txt` unless build time becomes a real problem.

## 3. Frontend → Vercel

1. Import the GitHub repo into Vercel, set the project root to `frontend/`.
2. Vercel reads `frontend/vercel.json` automatically:
   - build command: `npm run build:web` (`expo export -p web`)
   - output directory: `dist`
   - SPA rewrite (`/(.*)` → `/index.html`) so client-side routes like `/auth/phone` don't 404 on refresh/deep-link
3. Set this environment variable in Vercel (Project Settings → Environment Variables):

   | Variable | Value |
   |---|---|
   | `EXPO_PUBLIC_BACKEND_URL` | your Railway backend URL, e.g. `https://<your-app>.up.railway.app` |

   `EXPO_PUBLIC_*` vars are inlined into the JS bundle at build time — set it before the first deploy, and redeploy after changing it (it won't take effect on a running deployment).

4. Deploy. Then go back to Railway and set `CORS_ORIGINS` to the resulting Vercel URL (step 2 above), and redeploy the backend so it actually accepts requests from the frontend's origin.

## 4. Post-deploy smoke test

- Load the Vercel URL, confirm the landing page renders.
- Sign up with a real email, confirm the verification code email arrives (Brevo).
- Complete onboarding through the verification-photo step — confirm the browser prompts for camera permission (not a file picker) and DeepFace returns a result.
- Refresh on a deep link (e.g. `/auth/phone`) directly — should render, not 404 (this is what the Vercel rewrite guarantees; a plain static file server without SPA-fallback would 404 here).

## Local files this relies on

- `backend/railway.json`, `backend/nixpacks.toml` — Railway build/start config (already committed)
- `frontend/vercel.json` — Vercel build/output/rewrite config (already committed)
- `frontend/app.json` → `expo.web.output: "single"` — required for the SPA rewrite to work correctly
- `backend/.env` — **local dev only, gitignored, never committed.** Production secrets are set directly in Railway's dashboard, not from this file.
