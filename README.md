# SourceTheVIN

SourceTheVIN is a role-based vehicle trade-in workflow for dealership sellers and an internal Trade Desk. Sellers can submit a vehicle through a guided VIN, condition, payoff, and photo flow; Trade Desk users can review the queue and build an internal acquisition valuation. Administrators are intended to manage users and seller access as the product evolves.

The application is organized as a TypeScript monorepo with a React single-page app, an Express API, shared Zod schemas, MongoDB persistence, Cloudinary photo uploads, and NHTSA vPIC VIN decoding.

## Current status

The repository currently includes:

- Seller access requests and sign-in with role-based routing
- Short-lived JWT access tokens and rotating, HTTP-only refresh cookies
- Authentication and role middleware that re-checks the user's current database status
- A six-step seller submission wizard with autosave
- Server-side NHTSA vPIC VIN decoding with a cache
- Signed Cloudinary photo uploads with submission-scoped public IDs
- Seller submission history
- A tenant-scoped Trade Desk queue with filtering and pagination
- Trade Desk vehicle detail and valuation workspace
- Server-computed recommended acquisition limits and audited overrides
- Shared request and response schemas across the frontend and API
- Netlify and Render deployment configuration

Offer negotiation, complete audit-trail views, and full administration workflows remain roadmap work. The admin route currently contains a placeholder screen.

## Roles

| Role         | Responsibilities                                      | Data boundary                                     |
| ------------ | ----------------------------------------------------- | ------------------------------------------------- |
| `seller`     | Request access, create and track trade-in submissions | Can access only submissions they own              |
| `trade_desk` | Review the tenant queue and maintain valuations       | Can access internal valuation data for its tenant |
| `admin`      | Manage users and seller approvals (planned)           | Must not receive Trade Desk valuation data        |

Internal bid references, expenses, target margins, notes, recommended limits, and overrides are restricted to the `trade_desk` role.

## Architecture

```text
Browser (React + Vite)
        |
        | JSON over HTTPS; JWT access token + refresh cookie
        v
Express API
   |---- MongoDB (users, submissions, valuations, audit events, VIN cache)
   |---- NHTSA vPIC API (VIN decoding)
   `---- Cloudinary (API-signed browser uploads)
```

All application data access goes through the API so authorization, tenant scoping, validation, and audit logging remain centralized. The browser uploads photos directly to Cloudinary only after receiving a short-lived signed upload payload from the API.

## Repository layout

```text
sourcethevin/
├── apps/
│   └── web/              # React, Vite, Tailwind CSS
├── services/
│   └── api/              # Express, Mongoose, authentication, integrations
├── packages/
│   └── shared/           # Shared TypeScript types and Zod schemas
├── netlify.toml          # Web build and SPA redirect configuration
└── render.yaml           # API service blueprint
```

## Prerequisites

- Node.js 22.22.2+, 24.15.0+, or 26+ (Node.js 25 is unsupported)
- npm
- MongoDB, either local or hosted
- A Cloudinary account for the photo step

The public NHTSA vPIC API does not require an API key.

## Local development

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Create local environment files:

   ```bash
   cp services/api/.env.example services/api/.env.local
   cp apps/web/.env.example apps/web/.env.local
   ```

3. Replace the placeholder API secret and Cloudinary values in `services/api/.env.local`. The checked-in defaults expect MongoDB at `mongodb://localhost:27017/sourcethevin`, the API at `http://localhost:4000`, and the web app at `http://localhost:5173`.

4. Start the API and web app in separate terminals:

   ```bash
   npm run dev:api
   ```

   ```bash
   npm run dev:web
   ```

5. Open `http://localhost:5173`.

New seller registrations are created with `pending` status and cannot sign in until activated. A seed or admin-approval workflow is not yet implemented, so local bootstrap users must currently be created or updated directly in MongoDB with a valid Argon2 password hash.

## Environment variables

### API (`services/api/.env.local`)

| Variable                | Required   | Purpose                                           |
| ----------------------- | ---------- | ------------------------------------------------- |
| `PORT`                  | No         | Express port; defaults to `4000`                  |
| `MONGODB_URI`           | Yes        | MongoDB connection string                         |
| `JWT_ACCESS_SECRET`     | Yes        | Signs access tokens; use a long, random value     |
| `WEB_ORIGIN`            | Yes        | Exact browser origin allowed by CORS              |
| `NODE_ENV`              | No         | Use `production` to enable secure refresh cookies |
| `CLOUDINARY_CLOUD_NAME` | For photos | Cloudinary account name                           |
| `CLOUDINARY_API_KEY`    | For photos | Cloudinary API key                                |
| `CLOUDINARY_API_SECRET` | For photos | Cloudinary signing secret                         |

### Web (`apps/web/.env.local`)

| Variable            | Required | Purpose                     |
| ------------------- | -------- | --------------------------- |
| `VITE_API_BASE_URL` | Yes      | Base URL of the Express API |

Never place secrets in `VITE_*` variables; Vite embeds them in the browser bundle.

## Available scripts

Run these from the repository root:

| Command                | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `npm run dev:web`      | Start the Vite development server               |
| `npm run dev:api`      | Start the API with file watching                |
| `npm run lint`         | Lint all workspaces                             |
| `npm run format:check` | Check Prettier formatting                       |
| `npm run typecheck`    | Type-check all workspaces                       |
| `npm test`             | Run workspace test suites                       |
| `npm run build`        | Build all workspaces that define a build script |

Use `npm run format` to apply Prettier formatting.

Type checking uses TypeScript 7 through the `@typescript/native` npm alias. The
`typescript` dependency aliases `@typescript/typescript6` for ESLint, which still
requires the TypeScript 6 compiler API. Keep both aliases when updating tooling.

## API overview

The API listens on port `4000` by default. Implemented routes include:

| Method and path                            | Access                    | Purpose                                                    |
| ------------------------------------------ | ------------------------- | ---------------------------------------------------------- |
| `GET /health`                              | Public                    | Service health check                                       |
| `POST /auth/register-seller-request`       | Public, rate-limited      | Create a pending seller account                            |
| `POST /auth/login`                         | Public, rate-limited      | Authenticate an active user                                |
| `POST /auth/refresh`                       | Refresh cookie            | Rotate the refresh token and issue an access token         |
| `POST /auth/logout`                        | Refresh cookie            | Revoke the current refresh token                           |
| `GET /vin/:vin/decode`                     | Authenticated             | Decode and cache a 17-character VIN                        |
| `POST /submissions`                        | Seller                    | Create a decoded-VIN draft submission                      |
| `GET /submissions`                         | Seller, Trade Desk, admin | List submissions within the caller's role and tenant scope |
| `GET /submissions/:id`                     | Seller, Trade Desk, admin | Retrieve a viewable submission                             |
| `PATCH /submissions/:id`                   | Seller owner              | Autosave wizard data                                       |
| `DELETE /submissions/:id`                  | Seller owner              | Delete a draft submission                                  |
| `POST /submissions/:id/photos/sign`        | Seller owner              | Create a signed Cloudinary upload payload                  |
| `POST /submissions/:id/photos`             | Seller owner              | Confirm an uploaded photo                                  |
| `POST /submissions/:id/submit`             | Seller owner              | Submit a completed draft                                   |
| `GET /submissions/:id/valuation`           | Trade Desk                | Retrieve the internal valuation workspace                  |
| `PUT /submissions/:id/valuation`           | Trade Desk                | Save valuation inputs and recompute the limit              |
| `POST /submissions/:id/valuation/override` | Trade Desk                | Override the limit with an audited reason                  |

The recommended maximum acquisition amount is calculated on the server:

```text
max(bid references) - sum(estimated expenses) - target margin
```

Clients cannot submit the calculated result directly.

## Validation and security

- Passwords are hashed with Argon2id.
- Refresh tokens are stored as hashes, rotated on refresh, and sent in HTTP-only cookies.
- Protected requests reload the current user, so suspended accounts lose access even if an older access token has not expired.
- Route access is constrained by role, tenant, and seller ownership.
- Shared Zod schemas validate supported request payloads.
- VIN and authentication routes are rate-limited.
- Cloudinary confirmations verify the expected public ID and delivery URL.
- Valuation information is omitted from seller and administrator responses.
- Valuation overrides and submission events create audit records.

See the development plan for additional hardening still planned, including security headers, expanded request validation, stronger upload checks, structured logging, and comprehensive audit coverage.

See [SECURITY.md](SECURITY.md) for how secrets are inventoried, verified non-functional in committed files, and injected at runtime for local development and both production deploy targets.

## Testing

The test suites use Vitest and cover core API and browser behavior, including password handling, token issuance, authorization middleware, VIN decoding, Cloudinary helpers, valuation math, shared schemas, and application routing.

Run the full local quality gate with:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

## Deployment

### API on Render

`render.yaml` installs the monorepo dependencies, starts the `services/api` workspace, and checks `GET /health`. Configure `MONGODB_URI`, `JWT_ACCESS_SECRET`, `WEB_ORIGIN`, the Cloudinary variables, and the Resend variables in Render; the API refuses to start in production if any required value is missing. `COOKIE_SAMESITE` is `none` while the web app and API are on different sites (default `*.netlify.app` / `*.onrender.com` URLs) — switch it to `lax` once both share a parent domain.

Create the first admin once the API is live (from a Render shell, or locally against the production `MONGODB_URI`); the account must change its password on first sign-in:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-temporary-password' npm run create-admin --workspace services/api
```

### Web on Netlify

`netlify.toml` builds `apps/web`, publishes `apps/web/dist`, and redirects all routes to `index.html` for client-side routing. Set `VITE_API_BASE_URL` to the deployed API origin in Netlify before the first build — it is baked into the bundle at build time.

For production, use separate MongoDB databases and Cloudinary folder namespaces for development, staging, and production.

## Roadmap

The development plan organizes the remaining work into these major areas:

- Offer creation, versioning, acceptance, decline, and seller counter-offers
- Read-only audit trail screens for Trade Desk and administrators
- Administrator user, role, status, and seller-approval workflows
- Security hardening, deployment smoke tests, and broader transactional audit guarantees

## License

This project is licensed under the terms in [LICENSE](LICENSE).
