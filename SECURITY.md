# Security

## Secrets and configuration management

This project has no mobile app shell and no third-party Meta/Facebook SDK
integration — the credential surface that exists is the API's backing
services (MongoDB, JWT signing, Cloudinary) and the web app's API base URL.
The principle below is the same one OWASP's Mobile Top 10 **M1: Improper
Credential Usage** describes for app shells (never ship real secrets inside
a committed build artifact); here it applies to this repo's committed
config and manifest-equivalent files (`render.yaml`,
`netlify.toml`, `.env.example`).

### Inventory

| Value                   | Used by                               | Committed placeholder                                                   | Real value lives                                                                                       |
| ----------------------- | ------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `MONGODB_URI`           | `services/api` (Mongoose connection)  | `mongodb://localhost:27017/sourcethevin` in `services/api/.env.example` | Local `.env.local`; Render dashboard env var (`sync: false`) in production                             |
| `JWT_ACCESS_SECRET`     | `services/api` (access token signing) | `change-me-to-a-long-random-string` in `services/api/.env.example`      | Local `.env.local`; Render dashboard env var (`sync: false`) in production                             |
| `CLOUDINARY_CLOUD_NAME` | `services/api` (signed photo uploads) | `your-cloud-name` in `services/api/.env.example`                        | Local `.env.local`; Render dashboard env var (`sync: false`) in production                             |
| `CLOUDINARY_API_KEY`    | `services/api` (signed photo uploads) | `your-api-key` in `services/api/.env.example`                           | Local `.env.local`; Render dashboard env var (`sync: false`) in production                             |
| `CLOUDINARY_API_SECRET` | `services/api` (signed photo uploads) | `your-api-secret` in `services/api/.env.example`                        | Local `.env.local`; Render dashboard env var (`sync: false`) in production                             |
| `WEB_ORIGIN`            | `services/api` (CORS allow-list)      | `http://localhost:5173` in `services/api/.env.example`                  | Not secret, but still set per-environment via Render dashboard, not hardcoded                          |
| `VITE_API_BASE_URL`     | `apps/web` (API client base URL)      | `http://localhost:4000` in `apps/web/.env.example`                      | Not secret (embedded in the client bundle by design — see below); set via Netlify UI/CLI build env var |

Everything in the inventory that is an actual secret (`MONGODB_URI`,
`JWT_ACCESS_SECRET`, `CLOUDINARY_*`) is read at runtime with
`process.env.*` in `services/api` — see `services/api/src/db/connection.ts`,
`services/api/src/lib/tokens.ts`, and `services/api/src/lib/cloudinary.ts`.
No secret is ever read from, or written into, a checked-in config,
manifest, or blueprint file.

### Placeholder verification (M1 credential-storage check)

Every value committed to `.env.example`, `render.yaml`, and
`netlify.toml` was checked and confirmed non-functional:

- `services/api/.env.example` and `apps/web/.env.example` contain only
  obvious placeholders (`change-me-to-a-long-random-string`,
  `your-cloud-name`, `your-api-key`, `your-api-secret`) or local-only
  defaults (`localhost` URLs) — none resolve to a real external account.
- `render.yaml` declares every secret-bearing key with
  `sync: false`, which tells Render the value must be entered manually in
  its dashboard and explicitly excludes it from the committed blueprint.
- `netlify.toml` contains no environment variables at all; build
  config is read from Netlify's own UI/CLI env store.
- A full-history search of this repository (`git log --all -p`) for
  `.env` files, MongoDB Atlas-style `mongodb+srv://` URIs, populated
  `JWT_ACCESS_SECRET=`/`CLOUDINARY_API_SECRET=` assignments, AWS-style
  access keys, `sk-`-prefixed tokens, and PEM private key blocks turned up
  no matches, in the current tree or in any past commit. `.env.local` (the
  only file that ever holds real values) has never been tracked by git —
  only the `.example` templates have.

### Intended injection mechanism

Real values are never hardcoded into a committed file. Instead:

- **Local development**: copy `services/api/.env.example` →
  `services/api/.env.local` and `apps/web/.env.example` →
  `apps/web/.env.local`, then fill in real values. Both `.env.local`
  filenames are gitignored (see below) and `process.loadEnvFile('.env.local')`
  / Vite's built-in `.env.local` loading reads them at process start —
  nothing is ever committed.
- **API in production (Render)**: `render.yaml` is a blueprint, not
  a secret store. Every secret key is declared with `sync: false` so Render
  prompts for the real value once in its dashboard (or via `render env`)
  and injects it as a runtime environment variable; the blueprint itself
  never contains a real value.
- **Web in production (Netlify)**: `netlify.toml` defines only the
  build command and publish directory. `VITE_API_BASE_URL` is set as a
  build-time environment variable in the Netlify UI/CLI, which Vite bakes
  into the static bundle during `npm run build`. This value is the API's
  public origin, not a secret, so baking it into the client bundle is
  intended, not a leak — Vite only ever exposes `VITE_`-prefixed variables
  to client code for this reason, and no non-`VITE_` (server-only) secret
  is ever given that prefix.
- **CI**: this repository has no CI secret injection configured yet. If a
  CI pipeline is added later (e.g. to run `npm test`/`npm run build`
  against a real Cloudinary/Mongo sandbox), secrets must be added to that
  CI provider's own encrypted secret store (e.g. GitHub Actions repository
  secrets) and referenced by name in the workflow — never written into a
  workflow YAML file or any other committed file.

### `.gitignore` coverage

`.gitignore` already excludes every local file that could hold a real
value under the mechanism above:

```
.env*
!.env.example
.env.local
.env.*.local
```

`.env*` excludes any env file by default, `!.env.example` re-includes the
placeholder templates so they can be committed and reviewed, and the
explicit `.env.local` / `.env.*.local` entries cover the exact filenames
used by both workspaces even if the broader `.env*` rule is ever narrowed.
No changes were needed here — coverage was already correct.

### Status

**Mitigated.** No real credential exists in this repository, in any
committed file, or in git history. Every placeholder is non-functional.
Every secret is documented with an explicit, non-hardcoded injection path
for local development and for both production deploy targets.
