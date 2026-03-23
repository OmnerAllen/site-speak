# Site-Speak Auth & RBAC Plan

## Current State

**rag-kadebaxter auth** uses:
- **Keycloak OIDC** (shared instance at `auth.snowse-ts.duckdns.org/realms/frontend`)
- Browser: `react-oidc-context` for login, stores the ID token in a `SameSite=Strict` cookie
- API: Express middleware extracts the JWT from the cookie, verifies it with embedded JWKS via `jose`
- Data scoped by `email` from the token -- **no RBAC**, every authenticated user has the same access

**site-speak** currently has:
- **Zero authentication** -- every endpoint is wide open
- A .NET minimal API (ASP.NET Core, raw Npgsql, no ORM)
- React 19 + Vite + react-router-dom frontend
- A domain `employee.type` field with `'admin'` / `'worker'` values, but that's purely business data, not security

---

## Approach

Use **Keycloak for authentication** (same as RAG) but build **application-level RBAC in-house**. No reinventing login/password flows, but roles and permissions live in our database under our control.

---

## 1. Database -- New Auth/RBAC Tables

```sql
CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keycloak_sub VARCHAR(255) UNIQUE NOT NULL,  -- 'sub' claim from JWT
    email VARCHAR(255) UNIQUE NOT NULL,
    employee_id UUID REFERENCES employee(id),   -- link to domain employee
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL  -- e.g. 'admin', 'worker'
);

CREATE TABLE permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL  -- e.g. 'projects:write', 'worklogs:read'
);

CREATE TABLE user_role (
    user_id UUID REFERENCES app_user(id) ON DELETE CASCADE,
    role_id UUID REFERENCES role(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permission (
    role_id UUID REFERENCES role(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permission(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
```

Key design decisions:
- `app_user.keycloak_sub` links Keycloak identity to local user record
- `app_user.employee_id` optionally ties the login to a domain employee
- Roles like `admin` and `worker` map to existing `employee.type`
- Permissions give granular control: `projects:read`, `projects:write`, `employees:manage`, `worklogs:write`, etc.

---

## 2. API -- .NET Authentication + Authorization

Since site-speak is .NET (not Express like RAG), use ASP.NET Core's built-in auth pipeline:

- **`Microsoft.AspNetCore.Authentication.JwtBearer`** -- validates the Keycloak JWT automatically (fetches JWKS from Keycloak's discovery endpoint, no need to hardcode keys like RAG does)
- **Custom authorization middleware/policies** that look up the user's roles and permissions from the database after the JWT is validated
- An "auto-provision" step: on first authenticated request, if no `app_user` row exists for that `sub`, create one (and optionally link to an existing employee by email match)

Route protection:

```csharp
// Public
app.MapGet("/health/db", ...);

// Any authenticated user
app.MapGet("/companies", ...).RequireAuthorization();

// Admin only
app.MapPost("/companies", ...).RequireAuthorization("AdminOnly");

// Worker or Admin
app.MapPost("/worklogs", ...).RequireAuthorization("WorkerOrAdmin");
```

Also need a `GET /me` endpoint that returns the current user's profile, roles, and permissions so the frontend knows what to show.

---

## 3. Frontend -- OIDC + Route Guards

Same pattern as RAG but adapted for site-speak:

- Add `react-oidc-context` + `oidc-client-ts` (same libraries as RAG)
- Wrap the app in `<AuthProvider>` pointing at the same Keycloak realm (register a new client ID for site-speak, or reuse `kaden-react`)
- Set the ID token as a cookie (same `id_token` cookie pattern as RAG) so it's sent with API requests
- Route-level protection:
  - **Public pages**: Login page (unauthenticated only)
  - **Authenticated**: Dashboard, view work logs
  - **Admin only**: CRUD employees, CRUD projects, manage workers, scheduling, buy materials
  - **Worker only** (or worker+admin): Fill out work logs, voice-to-text forms
- Call `GET /me` on login to get roles/permissions, store in React context for conditional UI rendering

---

## 4. Auth Flow End-to-End

1. User hits site-speak, not logged in --> sees Login page only
2. Clicks "Log in" --> redirected to Keycloak, authenticates
3. Keycloak redirects back with tokens --> `react-oidc-context` stores them, cookie is set
4. Frontend calls `GET /me` --> API validates JWT, auto-provisions `app_user` if first login, returns user + roles + permissions
5. Frontend stores roles in context, renders appropriate nav/routes
6. Each API call sends the cookie --> .NET middleware validates JWT, loads roles from DB, checks authorization policy
7. Unauthorized requests get 403, unauthenticated get 401

---

## Key Differences from RAG's Approach

| Aspect | RAG (rag-kadebaxter) | Site-speak (proposed) |
|---|---|---|
| Identity provider | Keycloak OIDC | Same Keycloak OIDC |
| Token transport | Cookie (`id_token`) | Same cookie pattern |
| JWT validation | Hardcoded JWKS in code (`jose`) | Auto-discovery from Keycloak metadata (ASP.NET JwtBearer) |
| RBAC | None -- flat access by email | Full in-house: roles + permissions tables |
| User table | None (just email in data) | `app_user` with Keycloak link |
| API framework | Express middleware | ASP.NET Core policies + custom auth handler |
| Route protection | Client-side only (show/hide UI) | Both client guards AND server-side policy enforcement |

---

## Implementation Priority

1. **Database tables** -- add `app_user`, `role`, `permission`, junction tables, seed with `admin` and `worker` roles and their permissions
2. **API auth middleware** -- wire up JWT Bearer + custom RBAC policy handler in `Program.cs`
3. **Auto-provision endpoint** (`GET /me`) -- creates user on first login, returns roles
4. **Frontend OIDC** -- wrap in `AuthProvider`, login page, cookie handling
5. **Route guards** -- protect pages by role
6. **Secure existing endpoints** -- add `.RequireAuthorization()` with appropriate policies
