# Asset Manager

Asset Manager is a React and TypeScript web application for creating, editing, importing, and organizing asset metadata. It provides a shared interface for managing schema backed documents. One or more curated forms can be created per schema, or the schema can be used to present a default form.

The application uses OpenID Connect (OIDC) for authentication and uses Asset Docs (link), a basic [PostREST](https://docs.postgrest.org) instance with row level security rules defined for documents.

## Features

- Authenticate users with OIDC
- Create and manage documents from forms or schemas
- Define object types that contain
- Upload and manage document files
- Import records from CSV and other configured import workflows
- Provide role-aware routes for regular users and administrators

## Requirements

- Access to a compatible asset metadata API - see Asset Docs (link)
- An OIDC provider and client registration for the application - see Authentik (link)

## Getting started

Install dependencies:

```sh
npm install
```

Create a local environment file such as `.env.local` and set the values required by your environment:

```dotenv
VITE_ENVIRONMENT=development
VITE_OIDC_AUTHORITY=https://example.invalid/application/o/asset-manager/
VITE_OIDC_CLIENT_ID=your-client-id
VITE_OIDC_REDIRECT_URI=http://localhost:4422/authed
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:4422/loggedout
VITE_OIDC_SCOPE=profile email entitlements
VITE_APPS_API_BASE_URL=http://localhost:3345
VITE_IMPORT_MERGE_RPC=
VITE_SITE_TITLE=Asset Manager
```

The OIDC redirect URLs must also be registered with the identity provider. Update the API URL and OIDC values for the services used by your environment.

Start the development server:

```sh
npm run dev
```


## Docker

Build and start the production-style container with Docker Compose:

```sh
docker compose up --build
```

The application is available at `http://localhost:9797`.

Docker Compose passes the following host environment variables into the container and maps them to the runtime `TWOWOLVES_*` names used by the Nginx entrypoint:

| Host variable | Purpose |
| --- | --- |
| `VITE_OIDC_AUTHORITY` | OIDC provider authority URL |
| `VITE_OIDC_CLIENT_ID` | OIDC client identifier |
| `VITE_OIDC_REDIRECT_URI` | Login callback URL |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | Post-logout URL |
| `VITE_OIDC_SCOPE` | OIDC scopes |
| `VITE_APPS_API_BASE_URL` | Asset metadata API base URL |

Set these variables in the shell or in a `.env` file next to `docker-compose.yml` before running Compose. The redirect URL must match the URL at which the container is exposed.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and build the production bundle |
| `npm run preview` | Serve the production bundle locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest test suite once |

## Project structure

```text
src/
	auth/                 OIDC authentication hooks
	components/           Shared application and UI components
	config/               Environment and application configuration
	import/               CSV/import workflows and reconciliation logic
	manage/               Document and metadata management features
	services/             API service integrations
	state/                Shared Jotai state
	App.tsx               Application routes and providers
public/                 Static files and sample metadata
docker/                 Nginx configuration and runtime env injection
```

## Testing and validation

Run the focused checks locally with:

```sh
npm test
npm run lint
npm run build
```

The test suite includes import adapters, CSV handling, reconciliation, relationship planning, and related service behavior. End-to-end login and API workflows require the corresponding external services to be available.

## Configuration notes

Configuration values have defaults in `src/config/config.ts`, but the default OIDC client ID is intentionally invalid and the default API URL points to `http://localhost:3345`. Set environment variables for any real deployment.

For Docker deployments, the image is built once and runtime values are substituted into the generated JavaScript by the Nginx entrypoint. This makes it possible to use the same image across environments without rebuilding the frontend.