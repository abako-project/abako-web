# Work3Spaces (Abako / PolkaTalent)

**Decentralized marketplace for freelancers, built on Polkadot/Virto Network.**

> A client proposes a project, a DAO (decentralized autonomous organization) assigns a consultant, the consultant defines the scope with milestones, the client approves, a team is formed, development takes place, work is reviewed and payment is released through a blockchain escrow system.

[![Status: In Migration](https://img.shields.io/badge/Status-In%20Migration-orange)]()
[![Branch](https://img.shields.io/badge/Branch-feature%2Fweb--refactor-blue)]()
[![Node](https://img.shields.io/badge/Node.js-%3E%3D18-green)]()
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-61dafb)]()

---

## Table of Contents

1. [About the Project](#-about-the-project)
2. [Technology Stack](#-technology-stack)
3. [General Architecture](#-general-architecture)
4. [Project Structure](#-project-structure)
5. [Prerequisites](#-prerequisites)
6. [Getting Started](#-getting-started)
7. [Available Scripts](#-available-scripts)
8. [Migration Status](#-migration-status)
9. [Application Test Flow](#application-test-flow-for-external-testers)
10. [TODOs](#-todos)
11. [Contributing to the Project](#-contributing-to-the-project)
12. [Useful Links](#-useful-links)

---

## About the Project

### What problem does it solve

Imagine you are a company (a **client**) and you need to develop software. Normally you would have to find freelancers on your own, negotiate prices, trust that they deliver on time, and manage payments manually. Work3Spaces solves all of this using **blockchain** (a decentralized, transparent, and immutable digital ledger).

### How it works

```
1. The CLIENT proposes a project (description, budget, deadline)
2. A DAO (community) votes and assigns a CONSULTANT to the project
3. The CONSULTANT defines the SCOPE: divides the project into MILESTONES
4. The CLIENT approves (or rejects) the proposed scope
5. A DEVELOPMENT TEAM is assigned to the milestones
6. Developers work and submit deliverables for review
7. The client reviews and approves each milestone
8. Payment is automatically released from the escrow system
```

### Key Concepts

| Concept | What is it | Why it matters |
|---------|------------|----------------|
| **Blockchain** | A distributed database where no one can alter the records. | Guarantees that payments and agreements are transparent and immutable. |
| **Polkadot** | A network of interconnected blockchains. | It is the infrastructure where our project lives. |
| **Virto Network** | A blockchain within Polkadot, specialized in commerce and payments. | Provides authentication tools (WebAuthn) and payments. |
| **DAO** | Decentralized Autonomous Organization: a group that makes decisions by voting. | Assigns consultants and teams fairly and transparently. |
| **Escrow** | Custody system: money is held until conditions are met. | The client deposits funds, but they are only released when the work is approved. |
| **Milestone** | A partial project deliverable with a defined scope. | Allows dividing work into manageable parts with incremental payments. |
| **WebAuthn** | Passwordless authentication, using biometrics or security keys. | Users register with their device, not with email/password. |
| **SPA** | Single Page Application: a web application that loads once and navigates without reloading the page. | The React frontend is an SPA that communicates directly with the external APIs. |

---

## Technology Stack

### Frontend (the complete application)

| Technology | Version | What it is used for |
|------------|---------|---------------------|
| **React** | 18.3 | Library for building the user interface with components |
| **TypeScript** | 5.7 | JavaScript with static types (catches errors before execution) |
| **Vite** | 6.0 | Ultra-fast development tool (compiles, reloads instantly) |
| **TailwindCSS** | 3.4 | Utility-class-based styling framework |
| **Zustand** | 5.0 | Global state manager (lightweight alternative to Redux) |
| **TanStack React Query** | 5.62 | Intelligent server data management (cache, retries, etc.) |
| **React Router** | 6.28 | Navigation between pages without reloading |
| **React Hook Form** | 7.54 | Efficient form handling |
| **Zod** | 3.24 | Data validation with typed schemas |
| **Axios** | 1.7 | HTTP client for communicating directly with the 3 external APIs |

### External APIs (no installation needed)

The frontend communicates **directly** with 3 APIs hosted at `dev.abako.xyz`. You do not need to start any server; they are already deployed and accessible via CORS.

| API | Base URL | What it is used for |
|-----|----------|---------------------|
| **Adapter API** | `dev.abako.xyz/adapter/v1` | CRUD for clients, developers, projects, milestones, and calendar |
| **Virto API** | `dev.abako.xyz/api` | WebAuthn authentication, payments, memberships |
| **Contracts API** | `dev.abako.xyz` | Deployment and interaction with smart contracts on the blockchain |

> **Note**: Previously, there was an Express.js backend that acted as an intermediary between the browser and the external APIs. That backend is no longer needed. The React frontend talks directly to the APIs using CORS (Cross-Origin Resource Sharing, a browser security mechanism that allows requests between different domains).

---

## General Architecture

### How the application works

```
         USER'S BROWSER
                 |
           React SPA (Vite)
           http://localhost:5173
                 |
         +-------+-------+
         |       |       |
         v       v       v
    Adapter   Virto   Contracts
      API      API      API
         \       |       /
          \      |      /
       dev.abako.xyz (CORS)
```

**Important**: There is no intermediate backend. The browser sends HTTP requests directly to `dev.abako.xyz`. This greatly simplifies the architecture: a single project (the frontend) that communicates with already-deployed APIs.

### The 3 frontend layers

The application is organized into 3 well-defined layers. Each layer has a single responsibility:

```
+------------------------------------------------------------------+
|  PRESENTATION LAYER (React components, pages, layouts)            |
|  Responsibility: display data and capture interactions            |
+------------------------------------------------------------------+
                            |
                    uses hooks and stores
                            |
+------------------------------------------------------------------+
|  SERVICE LAYER (services/)  -  58 business functions              |
|  Responsibility: compose data, orchestrate API calls,             |
|  apply business logic (e.g.: aggregate project with its milestones)|
+------------------------------------------------------------------+
                            |
                  calls API functions
                            |
+------------------------------------------------------------------+
|  API LAYER (api/adapter, api/virto, api/contracts)                |
|  Responsibility: communicate with external APIs via HTTP          |
|  52 functions (adapter) + 17 functions (virto) + 10 (contracts)   |
+------------------------------------------------------------------+
                            |
                  Axios HTTP requests
                            |
+------------------------------------------------------------------+
|  dev.abako.xyz  -  3 external APIs (already deployed)             |
+------------------------------------------------------------------+
```

### The Service Layer (`frontend/src/services/`)

Services are the **heart of the business logic**. Previously, this logic lived in the backend within the "SEDA layer" (`backend/models/seda/`). It has now been ported to TypeScript and lives directly in the frontend.

**Without services** (bad):
```typescript
// The component calls the API directly and composes data manually
const project = await getProjectInfo(projectId);
const clients = await getClients();
const developers = await getDevelopers();
const milestones = await getAllTasks(projectId);
// ... manual data composition in the component
```

**With services** (good):
```typescript
// The component uses the service, which handles everything internally
import { getProject } from '@/services';
const project = await getProject(projectId);
// The service aggregates project + client + consultant + milestones automatically
```

The service layer has 7 modules with 58 functions in total:

| Module | Functions | Responsibility |
|--------|-----------|----------------|
| `projectService.ts` | 15 | Project aggregation, optimized lists with `Promise.allSettled`, flow actions |
| `proposalService.ts` | 2 | Create and update project proposals |
| `clientService.ts` | 8 | Client CRUD, search by email, connection |
| `developerService.ts` | 9 | Developer CRUD, team resolution, search by email |
| `milestoneService.ts` | 10 | Milestone CRUD, reordering, submission/acceptance/rejection |
| `scopeService.ts` | 3 | Submit, accept, and reject scopes |
| `calendarService.ts` | 11 | Worker registration, availability, calendar contracts |

### The API Layer (`frontend/src/api/`)

API functions are **thin wrappers** over Axios that handle: building the correct URL, sending authentication headers, handling errors, and typing responses.

| Module | Functions | External API |
|--------|-----------|--------------|
| `api/adapter/` | 52 | Adapter API (`/adapter/v1`) - auth, clients, developers, projects, milestones, calendar |
| `api/virto/` | 17 | Virto API (`/api`) - WebAuthn, payments, memberships |
| `api/contracts/` | 10 | Contracts API - deploy, query, call |
| `api/config.ts` | -- | Centralized URL and endpoint configuration for the 3 APIs |

### Global State with Zustand

We use **Zustand** to manage global state (data that needs to be shared between multiple components). The authentication state is persisted in `localStorage` so that the user does not lose their session when reloading the page.

- **`authStore.ts`**: Stores the authenticated user's information, their token, and their role (client or developer). Uses `zustand/middleware/persist` to save the state in `localStorage` under the key `abako-auth-storage`.

Zustand is much simpler than Redux. Example:

```typescript
// How Zustand is used in a component
import { useAuthStore } from '@/stores/authStore';

function MyComponent() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) return <p>You are not logged in</p>;
  return <p>Hello, {user?.name}</p>;
}
```

### Permissions with Pure Functions (`frontend/src/lib/permissions.ts`)

Permissions are calculated with **pure functions** (no side effects, no state). They previously lived in the backend as Express middleware. Now they are TypeScript functions that receive the user and return `true` or `false`.

```typescript
import { isClient, isProjectConsultant, checkPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';

function ProjectActions({ project }) {
  const user = useAuthStore((s) => s.user);

  // Simple check
  if (isClient(user)) { /* show approve button */ }

  // Compound check (allows client OR consultant)
  const allowed = checkPermission(user, {
    projectClient: project.clientId,
    projectConsultant: project.consultantId,
  });
  if (allowed) { /* show actions */ }
}
```

### Server Data with React Query

For data coming from the external APIs (projects, milestones, payments), we use **TanStack React Query**. The hooks call services directly (not a proprietary backend). This gives us:

- **Automatic caching**: If you already loaded the project list, it will not request it from the API again.
- **Retries**: If a request fails, it automatically retries.
- **Background updates**: Data refreshes without the user noticing.

```typescript
// Example: hook that fetches projects directly from the external APIs
import { useProjects } from '@/hooks/useProjects';

function ProjectList() {
  const { data: projects, isLoading, error } = useProjects();

  if (isLoading) return <Spinner />;
  if (error) return <p>Error loading projects</p>;
  return projects.map(p => <ProjectCard key={p.id} project={p} />);
}
```

### Constants and Enums

Reference data (budgets, project types, skills, languages, etc.) is **no longer fetched from the backend**. They are defined as static constants in TypeScript:

| File | Contents |
|------|----------|
| `types/enums.ts` | Budgets, delivery times, project types, skills, roles, availability, proficiency |
| `constants/languages.ts` | Map of 154 ISO 639-3 codes to language names |

This eliminates an HTTP call (previously `GET /api/enums`) and guarantees that forms never show a spinner waiting for options.

---

## Project Structure

<details>
<summary><strong>Click to expand the full project tree</strong></summary>

```
website/
|
|-- frontend/                              # React SPA application (everything needed)
|   |-- src/
|   |   |-- main.tsx                       # Entry point: React + QueryClient + Router
|   |   |-- App.tsx                        # Root component with React Router
|   |   |-- index.css                      # Global styles with Tailwind
|   |   |
|   |   |-- api/                           # Communication layer with external APIs
|   |   |   |-- config.ts                  # URLs and endpoints for the 3 APIs (Adapter, Virto, Contracts)
|   |   |   |-- adapter/                   # 52 functions - Adapter API (NestJS)
|   |   |   |   |-- index.ts              # Barrel export
|   |   |   |   |-- auth.ts               # checkRegistered, customRegister, customConnect, sign
|   |   |   |   |-- clients.ts            # getClients, getClient, createClient, updateClient, ...
|   |   |   |   |-- developers.ts         # getDevelopers, getDeveloper, createDeveloper, ...
|   |   |   |   |-- projects.ts           # deployProject, assignTeam, proposeScope, getAllTasks, ...
|   |   |   |   |-- milestones.ts         # getMilestones, createMilestone, updateMilestone, delete
|   |   |   |   `-- calendar.ts           # registerWorker, setAvailability, getAvailableWorkers, ...
|   |   |   |-- virto/                     # 17 functions - Virto API (WebAuthn + payments)
|   |   |   |   |-- index.ts              # Barrel export + namespace exports
|   |   |   |   |-- client.ts             # Axios client configured for Virto
|   |   |   |   |-- types.ts              # Virto request/response types
|   |   |   |   |-- auth.ts               # checkUserRegistered, getAttestationOptions, customConnect, ...
|   |   |   |   |-- payments.ts           # createPayment, releasePayment, acceptAndPay, getPayment
|   |   |   |   `-- memberships.ts        # getMembers, checkMembership, addCommunityMember, ...
|   |   |   `-- contracts/                 # 10 functions - Smart Contracts API
|   |   |       `-- index.ts              # healthCheck, deployProjectV5/V6, queryMethod, callMethod, ...
|   |   |
|   |   |-- services/                      # Business logic layer (SEDA port)
|   |   |   |-- index.ts                  # Barrel export (58 functions)
|   |   |   |-- projectService.ts         # Project aggregation + N+1 optimization
|   |   |   |-- proposalService.ts        # Create and update proposals
|   |   |   |-- clientService.ts          # Client CRUD + connect + search
|   |   |   |-- developerService.ts       # Developer CRUD + team resolution
|   |   |   |-- milestoneService.ts       # Milestone CRUD + submission/acceptance/rejection
|   |   |   |-- scopeService.ts           # Submit, accept, reject scope
|   |   |   `-- calendarService.ts        # Worker registration + availability
|   |   |
|   |   |-- components/
|   |   |   |-- ui/                        # Reusable base components
|   |   |   |   |-- Button.tsx             # Button with variants
|   |   |   |   |-- Card.tsx               # Container card
|   |   |   |   |-- Input.tsx              # Input field
|   |   |   |   |-- Label.tsx              # Form label
|   |   |   |   |-- Spinner.tsx            # Loading indicator
|   |   |   |   `-- index.ts              # Barrel export (re-exports everything)
|   |   |   |-- shared/                    # Components shared between pages
|   |   |   |   |-- ProtectedRoute.tsx     # Route that requires authentication
|   |   |   |   |-- ErrorBoundary.tsx      # Catches React errors
|   |   |   |   |-- LoadingScreen.tsx      # Full loading screen
|   |   |   |   |-- EmptyState.tsx         # Empty state (no data)
|   |   |   |   `-- ProjectStateBadge.tsx  # Project state badge
|   |   |   |-- features/                  # Feature-specific components
|   |   |   |   |-- projects/
|   |   |   |   |   |-- ProjectActions.tsx         # Project action buttons
|   |   |   |   |   |-- ScopeBuilder.tsx           # Scope builder
|   |   |   |   |   `-- MilestoneStatusBadge.tsx   # Milestone status badge
|   |   |   |   `-- milestones/
|   |   |   |       |-- MilestoneCard.tsx          # Milestone card
|   |   |   |       |-- MilestoneList.tsx          # Milestone list
|   |   |   |       `-- MilestoneActions.tsx       # Milestone actions
|   |   |   `-- layouts/                   # Page structures
|   |   |       |-- AppLayout.tsx          # Main layout (sidebar + header + content)
|   |   |       |-- AuthLayout.tsx         # Authentication layout
|   |   |       |-- Header.tsx             # Top bar
|   |   |       `-- Sidebar.tsx            # Side menu
|   |   |
|   |   |-- pages/                         # Full pages (one per route)
|   |   |   |-- auth/
|   |   |   |   |-- LoginPage.tsx                  # Login page
|   |   |   |   |-- RegisterPage.tsx               # Role selection
|   |   |   |   |-- ClientLoginPage.tsx            # Client login
|   |   |   |   |-- DeveloperLoginPage.tsx         # Developer login
|   |   |   |   |-- ClientRegisterPage.tsx         # Client registration
|   |   |   |   `-- DeveloperRegisterPage.tsx      # Developer registration
|   |   |   |-- dashboard/
|   |   |   |   `-- DashboardPage.tsx              # Main dashboard
|   |   |   |-- projects/
|   |   |   |   |-- ProjectsPage.tsx               # Project list
|   |   |   |   |-- ProjectDetailPage.tsx          # Project detail
|   |   |   |   `-- CreateProjectPage.tsx          # Create proposal
|   |   |   |-- payments/
|   |   |   |   |-- PaymentsPage.tsx               # Payment list
|   |   |   |   `-- PaymentDetailPage.tsx          # Payment detail
|   |   |   `-- profiles/
|   |   |       |-- ProfilePage.tsx                # General profile
|   |   |       |-- ClientProfilePage.tsx          # Client profile
|   |   |       `-- DeveloperProfilePage.tsx       # Developer profile
|   |   |
|   |   |-- hooks/                         # Custom hooks (reusable logic)
|   |   |   |-- useAuth.ts                # Authentication hook (calls services)
|   |   |   |-- useProjects.ts            # Projects hook (React Query + services)
|   |   |   |-- useMilestones.ts          # Milestones hook
|   |   |   |-- usePayments.ts            # Payments hook
|   |   |   |-- useVotes.ts               # Voting hook
|   |   |   |-- useProfile.ts            # Profile hook
|   |   |   |-- useScope.ts               # Scope hook
|   |   |   `-- useEnums.ts               # Enums hook (static constants)
|   |   |
|   |   |-- stores/
|   |   |   `-- authStore.ts              # Global authentication state (Zustand + localStorage)
|   |   |
|   |   |-- lib/                           # Utilities and pure logic
|   |   |   |-- permissions.ts            # Pure permission functions (port of permission.js)
|   |   |   |-- flowStates.ts             # State machine (TypeScript)
|   |   |   |-- cn.ts                     # Utility for combining CSS classes (clsx + tailwind-merge)
|   |   |   |-- paymentUtils.ts           # Payment utilities
|   |   |   `-- virto-sdk.ts              # Virto Network SDK integration
|   |   |
|   |   |-- types/                         # TypeScript type definitions
|   |   |   |-- index.ts                  # Barrel export of all types
|   |   |   |-- user.ts                   # User and authentication types
|   |   |   |-- project.ts               # Project and milestone types
|   |   |   |-- client.ts                # Client types
|   |   |   |-- developer.ts             # Developer types
|   |   |   |-- payment.ts               # Payment and voting types
|   |   |   |-- enums.ts                 # Static constants (budgets, skills, roles, etc.)
|   |   |   `-- api.ts                   # API response/error types
|   |   |
|   |   `-- constants/
|   |       `-- languages.ts              # 154 ISO 639-3 language codes
|   |
|   |-- vite.config.ts                    # Vite configuration (aliases, build, server)
|   |-- tsconfig.json                     # TypeScript configuration
|   |-- tailwind.config.js                # Tailwind CSS configuration
|   `-- package.json                      # Frontend dependencies
|
|-- backend/                               # :warning: LEGACY - For reference only
|   |                                      # NOT required to run the application.
|   |                                      # Kept as reference during the migration.
|   |-- app.js                            # Express configuration (legacy)
|   |-- models/
|   |   |-- adapter.js                    # Original HTTP client (~1243 lines, ported to api/)
|   |   |-- flowStates.js                # Original state machine (ported to lib/)
|   |   `-- seda/                         # Original business logic (ported to services/)
|   |-- controllers/                      # Express controllers (logic ported to hooks/services)
|   |-- routes/                           # Express routes (no longer used)
|   `-- views/                            # 90+ EJS templates (old system)
|
|-- .context/                              # Technical project documentation
|   |-- PROJECT_ANALYSIS.md               # Full project analysis
|   |-- CODE_REVIEW_RESULTS.md            # Code review results
|   |-- FRONTEND_ARCHITECTURE.md          # React frontend architecture
|   |-- MIGRATION_PLAN.md                 # Detailed migration plan
|   `-- IMPLEMENTATION_BLUEPRINT.md       # Implementation blueprint with code
|
|-- .gitignore                             # Files excluded from git
`-- README.md                              # This file
```

</details>

---

## Prerequisites

Before getting started, make sure you have the following installed on your computer:

| Tool | Minimum version | How to verify | How to install |
|------|----------------|---------------|----------------|
| **Node.js** | >= 18.0 | `node --version` | [nodejs.org](https://nodejs.org/) |
| **npm** | >= 9.0 | `npm --version` | Comes with Node.js |
| **Git** | >= 2.0 | `git --version` | [git-scm.com](https://git-scm.com/) |
| **Docker** | >= 24.0 | `docker --version` | [docker.com](https://www.docker.com/) |
| **Docker Compose** | >= 2.20 | `docker compose version` | Comes with Docker Desktop / Docker Engine plugin |

> **Note**: You can use either **Node.js + npm** for local development with hot reload, or **Docker + Docker Compose** for a containerized production-style build. You do not need a database or backend server in either case because the frontend talks directly to the external APIs.

---

## Getting Started

### 1. Clone the repository

```bash
# Clone the project to your computer
git clone <REPOSITORY_URL>

# Enter the project folder
cd abako-web
```

### Option A. Run locally with npm (development mode)

```bash
# Enter the frontend folder
cd frontend

# Install all required libraries
npm install
npm run dev
```

It should display something like:
```
  VITE v6.0.3  ready in 300 ms

  > Local:   http://localhost:5173/
```

Open your browser and go to **http://localhost:5173**. The React application will communicate directly with the external APIs at `dev.abako.xyz` thanks to CORS. You do not need any backend server.

> **That is all for development.** `npm run dev` gives you the Vite development server with hot module replacement (HMR).

### Option B. Run with Docker Compose (build + serve)

Use this option when you want a containerized production build that is easy to run locally or deploy on a server.

```bash
# From the repository root
docker compose up --build -d
```

Open **http://localhost:8080**.

The compose stack:

- builds the frontend with Vite in a Node.js image
- serves the generated static files from Nginx
- supports SPA routes such as `/login` and `/projects/*`

Useful commands:

```bash
# Follow the container logs
docker compose logs -f

# Stop and remove the container
docker compose down
```

### Quick summary

```bash
git clone <REPOSITORY_URL>
cd abako-web

# Development mode with HMR
cd frontend
npm install
npm run dev
# Open http://localhost:5173

# Or run the production container from the repository root
cd ..
docker compose up --build -d
# Open http://localhost:8080
```

### Advanced configuration (optional)

For local development with `npm run dev`, you can create a `.env` file in the `frontend/` folder:

```bash
# frontend/.env (optional - defaults to dev.abako.xyz)
VITE_API_BASE_URL=https://staging.abako.xyz
VITE_KREIVO_RPC_URL=https://kreivo.abako.xyz
```

For Docker Compose, create a `.env` file in the repository root if you want to change the published port or build against a different API environment:

```bash
# .env at repository root (optional)
APP_PORT=8080
VITE_API_BASE_URL=https://staging.abako.xyz
VITE_KREIVO_RPC_URL=https://kreivo.abako.xyz
```

> **Important**: Vite injects `VITE_*` variables at build time. If you change them for Docker Compose, rebuild the image with `docker compose up --build -d`.

The shared API configuration lives in `frontend/src/api/config.ts`. If you do not create either `.env` file, the app defaults to `https://dev.abako.xyz`.

---

## Available Scripts

### Frontend (`frontend/package.json`)

| Script | Command | What it does |
|--------|---------|--------------|
| `dev` | `npm run dev` | Starts the Vite development server with hot module replacement (HMR) at `http://localhost:5173` |
| `build` | `npm run build` | Compiles TypeScript and generates the production build in `dist/` |
| `preview` | `npm run preview` | Serves the production build locally for verification before deployment |
| `lint` | `npm run lint` | Runs ESLint with zero warnings allowed |
| `type-check` | `npm run type-check` | Checks TypeScript types without generating files (only checks for errors) |

> **Note**: The most important command is `npm run dev`. It is the one you will use 99% of the time. The others are for verifying quality (`lint`, `type-check`) or preparing deployment (`build`, `preview`).

### Docker Compose (`docker-compose.yml`)

| Command | What it does |
|--------|--------------|
| `docker compose up --build -d` | Builds the production image and starts the Nginx container on `http://localhost:8080` (or `APP_PORT`) |
| `docker compose logs -f` | Streams container logs |
| `docker compose down` | Stops and removes the container |

> **Note**: The Docker workflow is intended for running a production bundle. Use `npm run dev` when you want fast feedback and hot reload while editing the frontend.

---

## Migration Status

The project is migrating from **EJS** (HTML templates rendered on the server with an Express backend) to **React SPA** (a modern application that talks directly to external APIs). The migration is divided into phases:

```
Phase 0: Prior fixes                      [##########] 100%  COMPLETED
  - Bugs in flowStates.js fixed
  - Bugs in adapter.js fixed
  - CORS configured on the external APIs
  - Session secret moved to environment variable
  - /backdoor/wild route removed
  - QA passed: 71/71 tests

Phase 1: Infrastructure + API + Services  [##########] 100%  COMPLETED
  - [x] React + Vite + TypeScript scaffold
  - [x] Tailwind CSS configured
  - [x] Complete API layer (52 adapter + 17 virto + 10 contracts)
  - [x] Centralized configuration in api/config.ts
  - [x] React Router configured
  - [x] Zustand auth store with localStorage persistence
  - [x] Complete service layer (58 functions, SEDA port)
  - [x] N+1 optimization with Promise.allSettled in projectService.ts
  - [x] React Query hooks connected to services

Phase 2: Shared logic                     [##########] 100%  COMPLETED
  - [x] Complete TypeScript types (7 files in types/)
  - [x] State machine in TypeScript (lib/flowStates.ts)
  - [x] Static constants in types/enums.ts (no backend call)
  - [x] Language map in constants/languages.ts (154 codes)

Phase 3: Auth + App Shell                 [########--]  80%  NEARLY COMPLETE
  - [x] Main layout (AppLayout, Sidebar, Header)
  - [x] Authentication layout (AuthLayout)
  - [x] 6 auth pages (login/registration for client and developer)
  - [x] Protected routes with ProtectedRoute
  - [x] Error boundaries
  - [x] Permissions ported to pure functions (lib/permissions.ts)
  - [ ] Polish complete WebAuthn flow (integration with Virto SDK)
  - [ ] Authentication tests

Phase 4: Core Pages + Scope              [----------]   0%  PENDING
  ** ATOMIC PHASE - cannot be split **
  - Dashboard, projects, milestones, and scope
  - All must be completed together

Phase 5: Payments + Profiles + Cutover   [----------]   0%  PENDING
  - Fully functional profile pages
  - Payment pages with escrow integration
  - Removal of the EJS system
  - Production deployment
```

> **What "ATOMIC" means**: Phase 4 cannot be done partially. The scope workflow (create milestones, edit, submit for approval) requires that all pages and components are connected. If we complete only half, the application is left in an inconsistent state where the user cannot finish a flow they started.

---

## Application Test Flow (for External Testers)

This section provides a complete step-by-step test plan covering **every functionality** of the application. Follow the flows in order — each section builds on the previous one.

> **Test environment**: `https://web.dev.abako.xyz` (or `http://localhost:5173` for local development)
>
> **Important**: You need two browser profiles (or two different browsers) to test the full flow — one for the **Client** role and one for the **Developer/Consultant** role.

---

### Flow 1: Registration

#### 1.1 Client Registration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/register` | Role selection page with "Developer" and "Client" cards |
| 2 | Click **"Client"** card | Navigate to `/register/client` |
| 3 | Enter an email and name | Fields accept input |
| 4 | Click **"Register"** | WebAuthn biometric prompt appears (fingerprint, Face ID, or security key) |
| 5 | Complete biometric authentication | Success message, redirect to `/login/client` |
| 6 | Verify "Sign in here" link | Navigates to `/login/client` |

#### 1.2 Developer Registration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/register` | Role selection page |
| 2 | Click **"Developer"** card | Navigate to `/register/developer` |
| 3 | Enter email and name | Fields accept input |
| 4 | Click **"Register"** | WebAuthn biometric prompt appears |
| 5 | Complete biometric authentication | Success message, redirect to `/login/developer` |

---

### Flow 2: Login

#### 2.1 Client Login

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login` | Role selection page with "Client" and "Developer" cards |
| 2 | Click **"Client"** card | Navigate to `/login/client` |
| 3 | Enter the registered client email | Field accepts input |
| 4 | Click **"Login"** | WebAuthn biometric prompt appears |
| 5 | Complete biometric authentication | Status messages shown (Connecting... / Verifying... / Success), then redirect to `/dashboard` |
| 6 | Verify sidebar shows user name and avatar | User info displayed at the bottom of the sidebar |

#### 2.2 Developer Login

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/login` → click **"Developer"** | Navigate to `/login/developer` |
| 2 | Enter the registered developer email | Field accepts input |
| 3 | Click **"Login"** | WebAuthn prompt → redirect to `/dashboard` |

#### 2.3 Login Error Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter a non-registered email and click Login | Error message displayed inline below the form |
| 2 | Cancel the WebAuthn prompt | Error message displayed |

---

### Flow 3: Sidebar Navigation & Logout

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **"Dashboard"** in sidebar | Navigate to `/dashboard` |
| 2 | Click **"Projects"** in sidebar | Navigate to `/projects` |
| 3 | Click **"Payments"** in sidebar | Navigate to `/payments` |
| 4 | Click **"Profile"** in sidebar | Navigate to `/profile` |
| 5 | Click **"Settings"** in sidebar | Navigate to `/settings` (placeholder page: "Settings will be available soon") |
| 6 | Click **"Logout"** button (bottom of sidebar) | Session cleared, redirect to `/login` |
| 7 | Try navigating to `/dashboard` while logged out | Redirect to `/login` (ProtectedRoute guard) |

**Mobile sidebar (resize browser to < 768px):**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click hamburger icon (top left) | Sidebar overlay opens |
| 2 | Click any nav link | Sidebar closes, navigation occurs |
| 3 | Click outside the sidebar overlay | Sidebar closes |

---

### Flow 4: Dashboard

> **Login as: Client**

#### 4.1 Projects Tab

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard` | Dashboard loads with "Projects" tab active by default |
| 2 | Verify **"New Project"** button is visible (client only) | Green button top-right corner |
| 3 | Verify projects are grouped by state | Groups like "Projects In Progress", "Awaiting Proposal Approval", etc. |
| 4 | Click any project card | Navigate to `/projects/:id` |

#### 4.2 Tasks Tab (Kanban Board)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **"Tasks"** tab | Kanban board with 3 columns: "Scheduled Milestones", "To Review", "Completed" |
| 2 | Verify "To Review" column has **green border** | Green accent border around the column |
| 3 | Verify milestones with `rejected` state appear in "To Review" column with a **red "Rejected" badge** | Badge visible on the card |
| 4 | Verify milestones with `in_review` state show a **"Review Now"** button (client only) | Green button on the milestone card |
| 5 | Click **"Review Now"** on a milestone | Navigate to `/projects/:projectId/milestones/:milestoneId/review` |
| 6 | Click a project filter chip | Kanban filters to show only milestones from that project |
| 7 | Click **"All Projects"** chip | All milestones shown again |
| 8 | Type in the **search field** | Milestones filtered by title, description, or project name |
| 9 | Clear the search field | All milestones shown again |
| 10 | Verify milestone count at the bottom | "Showing X of Y milestones" text |

> **Login as: Developer**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/dashboard` → Tasks tab | Kanban board visible |
| 2 | Verify **"New Project"** button is NOT visible | Button hidden for developers |
| 3 | Verify milestones in `task_in_progress` state show **"Submit for Review"** button | Button visible on developer's own milestones |
| 4 | Verify **"Review Now"** button is NOT visible for developers | Button hidden — review is client-only |

---

### Flow 5: Create a Project Proposal (Client Only)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **"New Project"** button (dashboard or projects page) | Navigate to `/projects/new` — 3-step wizard with stepper |

**Step 1 — Project Details:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 2 | Leave all fields empty, click **"Next"** | Validation errors shown on required fields |
| 3 | Fill in "Project Title" (min 5 chars) | Input accepted |
| 4 | Fill in "Short Summary" (max 280 chars) | Character counter visible and updates |
| 5 | Select a "Project Type" from dropdown | Option selected |
| 6 | Fill in "Project Link" (optional) | Input accepted |
| 7 | Fill in "Project Description" (min 20 chars) | Input accepted |
| 8 | Click **"Next: Define Objectives"** | Advances to Step 2 |

**Step 2 — Objectives & Constraints:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 9 | Click **"Add Objective"** | New objective input row appears |
| 10 | Type an objective text | Input accepted |
| 11 | Click **"Add Objective"** again | Second row appears |
| 12 | Click trash icon on an objective | Row removed |
| 13 | Click up/down arrows | Objectives reorder |
| 14 | Click **"Add Constraint"** | New constraint input row appears |
| 15 | Select a **Budget** radio option | Option selected |
| 16 | Select a **Delivery Time** radio option | Option selected |
| 17 | If "Specific date" selected | Date picker appears inline |
| 18 | Click **"Back"** | Returns to Step 1 with data preserved |
| 19 | Click **"Next: Review & Submit"** | Advances to Step 3 |

**Step 3 — Review & Submit:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 20 | Verify all entered data is displayed in the review card | Title, summary, description, objectives, constraints, budget, delivery time |
| 21 | Click pencil (edit) icon | Jumps back to Step 1 for editing |
| 22 | Click **"Submit Project"** | Project created, redirect to `/projects/:id` |

---

### Flow 6: Consultant Approves Proposal

> **Login as: Developer/Consultant** (the DAO-assigned consultant)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/projects/:id` (the newly created project) | Project detail page with state "Awaiting Proposal Approval" |
| 2 | Verify right column shows **"Proposal Review"** section | "Approve Proposal" and "Reject Proposal" buttons visible |
| 3 | Click **"Approve Proposal"** | Loading spinner, then project state changes to "Scoping In Progress" |

**Test rejection path (on a different project):**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 4 | Click **"Reject Proposal"** | Inline form expands with text input for reason |
| 5 | Try clicking **"Reject Proposal"** confirm with empty reason | Button is disabled |
| 6 | Enter a rejection reason | Button becomes enabled |
| 7 | Click **"Reject Proposal"** confirm | Project state changes to "Proposal Rejected" |
| 8 | Click **"Cancel"** | Form collapses, no action taken |

---

### Flow 7: Consultant Builds Scope

> **Login as: Consultant**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the approved project | State is "Scoping In Progress" |
| 2 | Click **"Details"** tab | ScopeBuilder visible for the consultant |
| 3 | Verify right column shows **"Build Scope"** button | Button visible |
| 4 | Click **"Add Milestone"** in the ScopeBuilder | New milestone form opens |
| 5 | Fill in: Title, Description, Budget (DUSD), Delivery Time, Delivery Date | All fields accept input |
| 6 | Select Role, Proficiency, Availability from dropdowns | Options selected |
| 7 | Click skill chips to select required skills | Chips toggle selected/deselected |
| 8 | If "Hours per Week" availability selected | "Hours per week" number input appears |
| 9 | Click **"Add Milestone"** to add more milestones | Additional milestones appended |
| 10 | Click a milestone row in the summary list | Edit form opens for that milestone |
| 11 | Click trash icon on a milestone | Milestone removed from list |
| 12 | Enter a **consultant comment** in the comment textarea | Input accepted |
| 13 | Click **"Submit Scope"** | Scope submitted, project state changes to "Scope Validation Needed" |

---

### Flow 8: Client Reviews Scope

> **Login as: Client**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the project | State is "Scope Validation Needed" |
| 2 | Verify right column shows **"Review Scope & Milestones"** button | Button visible with consultant's comment preview |
| 3 | Click **"Review Scope & Milestones"** | Navigate to `/projects/:id/review-scope` |
| 4 | Verify left column shows all milestones with details | Title, description, role, budget, delivery date per milestone |
| 5 | Verify total cost summary and overall delivery date | Aggregated values displayed |
| 6 | Verify right column shows consultant avatar, name, and comment | Consultant proposal card displayed |
| 7 | Optionally enter a client comment | Textarea accepts input |

**Accept path:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 8 | Click **"Accept"** toggle | Accept state selected, DUSD balance indicator shown |
| 9 | If first time: **EscrowPaymentModal** appears | 4-step explainer timeline displayed |
| 10 | Check **"Don't Show Again"** checkbox | Checkbox checked |
| 11 | Click **"Understood"** | Modal closes |
| 12 | If sufficient DUSD balance | Scope accepted, redirect to `/projects/:id` |
| 13 | If insufficient DUSD balance | Warning displayed, redirect to `/payments/:id/fund` for funding |

**Reject path:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 14 | Click **"Reject"** toggle instead | Reject state selected |
| 15 | Click submit | Scope rejected, redirect to `/projects/:id` with state "Scope Rejected" |

---

### Flow 9: Client Funds Escrow (Bank Transfer)

> **Login as: Client** (when redirected from scope acceptance with insufficient funds)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Arrive at `/payments/:id/fund` | 4-step bank transfer flow, left column shows milestones and total amount |

**Step 1 — Review:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 2 | Verify amount needed is displayed | Total project cost shown |
| 3 | Click **"Start Bank Transfer"** | API call to Bramp, transition to Step 2 |

**Step 2 — Bank Details:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 4 | Verify IBAN is displayed | IBAN field with copy button |
| 5 | Click copy icon next to IBAN | IBAN copied to clipboard |
| 6 | Verify Reference is displayed | Reference field with copy button |
| 7 | Click copy icon next to Reference | Reference copied to clipboard |
| 8 | Verify Amount is displayed | Amount field with copy button |
| 9 | Click **"I've Completed the Transfer"** | Transition to Step 3 (confirming) |

**Step 3 — Confirming:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 10 | Verify spinner/loading state is displayed | Waiting for backend confirmation |

**Step 4 — Done:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 11 | Verify success card is displayed | "Payment confirmed" message |
| 12 | Click **"Back to Scope Review"** | Navigate to `/projects/:id/review-scope` |
| 13 | Click **"Go to Project"** link | Navigate to `/projects/:id` |

**Error state:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 14 | If deposit fails | Error message displayed with "Try Again" button |
| 15 | Click **"Try Again"** | Resets to Step 1 |

---

### Flow 10: Consultant Assigns Team

> **Login as: Consultant**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the project (state "Awaiting Team Assignment") | Right column shows "Team Assignment" section |
| 2 | Click **"Assign Team"** | Loading spinner, then project state changes to "In Progress" |
| 3 | Verify milestones now have assigned developers | Developer names visible on each milestone |

---

### Flow 11: Developer Submits Milestone for Review

> **Login as: Developer** (assigned to a milestone)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the project → **Milestones** tab | Milestones listed with states |
| 2 | Find a milestone in "In Progress" state | "Submit for Review" button visible |
| 3 | Click **"Submit for Review"** | Inline form expands showing milestone summary |
| 4 | Verify milestone title and budget displayed (read-only) | Summary card shown |
| 5 | Enter a **Documentation URL** | Input accepted |
| 6 | Enter **Other Links** | Input accepted |
| 7 | Click **"Submit Milestone"** | Milestone state changes to "In Review" |
| 8 | Click **"Cancel"** instead | Form collapses, no action taken |

**Alternative: Submit from Dashboard Kanban**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 9 | Navigate to Dashboard → Tasks tab | Kanban board visible |
| 10 | Click **"Submit for Review"** on a milestone card | Navigate to project detail page |

---

### Flow 12: Client Reviews Milestone

> **Login as: Client**

#### 12.1 Review from Dashboard (Recommended — Full Page)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Dashboard → Tasks tab | "To Review" column shows milestones with `in_review` state |
| 2 | Click **"Review Now"** on a milestone card | Navigate to `/projects/:projectId/milestones/:milestoneId/review` |
| 3 | Verify milestone details card | Title, description, budget badge, developer avatar and name displayed |
| 4 | Verify documentation and links (if submitted) | Clickable external links shown |
| 5 | Click **"Accept Delivery"** toggle | Toggle highlighted green, comment label says "Comment (optional)" |
| 6 | Click **"Reject Delivery"** toggle | Toggle highlighted red, comment label says "Feedback for the developer (recommended)" |
| 7 | Enter a comment in the textarea | Input accepted |
| 8 | With no decision selected, verify submit button | Button disabled with text "Select a decision above" |
| 9 | With Accept selected, click **"Confirm Accept"** | Milestone accepted, redirect to `/projects/:projectId` |
| 10 | Verify help card shows consultant email | "Have some doubts?" card with email visible |

**Test rejection path:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 11 | Click **"Reject Delivery"** toggle | Toggle highlighted red |
| 12 | Enter feedback in textarea | Input accepted |
| 13 | Click **"Confirm Reject"** | Milestone rejected, redirect to `/projects/:projectId` |

#### 12.2 Review from Project Detail (Inline)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/projects/:id` → Milestones tab | Milestones listed |
| 2 | Find a milestone in "Awaiting Review" state | "Accept Delivery" and "Reject Delivery" buttons visible |
| 3 | Click **"Accept Delivery"** | Confirmation form expands with optional comment field |
| 4 | Click **"Confirm Accept"** | Milestone accepted |
| 5 | Click **"Reject Delivery"** | Confirmation form expands with feedback field |
| 6 | Click **"Confirm Reject"** | Milestone rejected |
| 7 | Click **"Cancel"** on either form | Form collapses |

---

### Flow 13: Developer Resubmits Rejected Milestone

> **Login as: Developer/Consultant**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the project → Milestones tab | Rejected milestone shows red warning: "Client rejected this submission" |
| 2 | Verify "Submit for Review" form is available below the warning | Resubmission form visible |
| 3 | Update documentation and links | Input accepted |
| 4 | Click **"Submit Milestone"** | Milestone resubmitted, state changes back to "In Review" |

---

### Flow 14: Client Evaluates Team (Project Completion)

> **Login as: Client** (when ALL milestones are completed)

#### 14.1 From Project Detail

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the project | Right column shows "All milestones completed!" with **"Evaluate Team"** button |
| 2 | Click **"Evaluate Team"** | Navigate to `/projects/:id/evaluate` |

#### 14.2 Team Evaluation Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 3 | Verify page header | Star icon, "Evaluate Your Team" title, project name in green |
| 4 | Verify coordinator card | 56px avatar, name, "Project Coordinator" role, 5 empty stars |
| 5 | Verify team member cards | One card per developer with 56px avatar, name, role, 5 empty stars |
| 6 | Hover over stars | Stars highlight up to hovered position |
| 7 | Click a star on the coordinator card | Rating set (e.g., 4/5), stars filled in green |
| 8 | Click a star on each team member card | Ratings set for all members |
| 9 | Verify **"Complete Project"** button is disabled before all ratings | Button disabled with helper text "Please rate all team members before completing the project" |
| 10 | After rating ALL members, verify button is enabled | Button active |
| 11 | Click **"Complete Project"** | Project completed, redirect to `/projects/:id` |
| 12 | Click **"Back to Project"** link | Navigate to `/projects/:id` without submitting |

---

### Flow 15: Consultant Rates Client & Team

> **Login as: Consultant** (after project is completed)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the completed project | Right column shows "Rate Project Participants" form |
| 2 | Verify client rating row | Client name, avatar, interactive star rating |
| 3 | Rate the client (click stars) | Stars filled in green |
| 4 | Verify team member rating rows | One row per developer |
| 5 | Rate all team members | Stars filled |
| 6 | Verify **"Submit Ratings"** is disabled until all rated | Button disabled |
| 7 | Click **"Submit Ratings"** | Success message: "Ratings submitted successfully" |

---

### Flow 16: Developer Rates Coordinator

> **Login as: Developer** (after project is completed)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the completed project | Right column shows "Rate the Coordinator" form |
| 2 | Verify coordinator row | Coordinator name, avatar, interactive star rating |
| 3 | Rate the coordinator (click stars) | Stars filled in green |
| 4 | Click **"Submit Rating"** | Success message: "Rating submitted successfully" |

---

### Flow 17: Client Releases Payment

> **Login as: Client** (after project is completed)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the completed project | Right column shows "Release Payment" section |
| 2 | Verify escrow amount and status displayed | Amount in DUSD and current state shown |
| 3 | Click **"Release Payment to Developer"** | Confirmation step appears with irreversibility warning |
| 4 | Click **"Confirm Release"** | Payment released, success message displayed |
| 5 | Click **"Cancel"** instead | Confirmation collapses |

---

### Flow 18: Developer Claims Payment

> **Login as: Developer** (after payment is released)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to the project | Right column shows "Payment Available" section |
| 2 | Click **"Claim Payment"** | Payment claimed, success message: "Funds have been transferred to your account" |

---

### Flow 19: Payments Pages

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **"Payments"** in sidebar | Navigate to `/payments` — list of projects with payment stats |
| 2 | Verify 5 stat cards per project | Total Budget, Escrow Deposited, Funds Remaining, Awaiting Payment, Paid |
| 3 | Verify "Awaiting Payment" and "Paid" columns | Milestones grouped by payment status |
| 4 | Click project title link | Navigate to `/projects/:id` |
| 5 | Navigate to `/payments/:id` (payment detail) | Breadcrumb, 4 summary cards, 3 milestone sections |
| 6 | Click **"View Project"** link in header | Navigate to `/projects/:id` |
| 7 | Verify milestone sections | "Not Started", "In Progress", "Completed and Paid" |

---

### Flow 20: Profile Management

#### 20.1 Developer Profile

> **Login as: Developer**

**View mode:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **"Profile"** in sidebar | Profile page loads with developer info |
| 2 | Verify 72px avatar (or initials fallback) | Avatar displayed |
| 3 | Verify name, ID hash, star rating | Info displayed |
| 4 | Verify skills chips, bio, background, info items | All profile data displayed |
| 5 | Verify **"DAO View"** button | Button visible next to name |
| 6 | Click **"DAO View"** | Navigate to `/profile/dao` |
| 7 | Verify reviews list (if any) | Review cards with star ratings |

**Membership NFT Card** (visible when user is a DAO member):

| Step | Action | Expected Result |
|------|--------|-----------------|
| 8 | Locate the **Membership NFT Card** below the profile card | Card with green gradient hexagonal artwork and "W3S" monogram |
| 9 | Verify **"Community Member"** title | Title displayed at the top of the card |
| 10 | Verify **"Verified"** badge | Green dot + "Verified" text |
| 11 | Verify **Membership ID** | Badge showing `#N` (e.g. `#42`) |
| 12 | Verify **Join Date** | Calendar icon + formatted date (e.g. "Jan 15, 2026") |
| 13 | Verify **Blockchain Address** | Full address displayed (e.g. `5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`) |
| 14 | Click the **blockchain address** | Address copied to clipboard, "Copied!" feedback shown briefly |

**Edit mode:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 8 | Click **"Edit Information"** | Switch to edit mode with form fields |
| 9 | Edit Name, Bio, Background fields | Inputs accept changes |
| 10 | Change Role and Proficiency dropdowns | Options selectable |
| 11 | Edit GitHub Username, Portfolio URL, Location | Inputs accept changes |
| 12 | Click skill chips to toggle selection | Chips toggle on/off |
| 13 | Toggle language checkboxes | Checkboxes toggle |
| 14 | Toggle "Available for Hire" switch | Switch toggles |
| 15 | Change Work Mode dropdown | "Full Time" / "Part Time" / "Hours per Week" |
| 16 | If "Hours per Week" selected | Weekly Hours number input appears |
| 17 | Click upload area for photo | File picker opens (max 2MB) |
| 18 | Select a photo | Preview shown |
| 19 | Click **"Save"** | Profile saved, returns to view mode |
| 20 | Click **"Cancel"** | Changes discarded, returns to view mode |

#### 20.2 Client Profile

> **Login as: Client**

**View mode:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click **"Profile"** in sidebar | Client profile page loads |
| 2 | Verify avatar, name, company name | Info displayed |
| 3 | Verify "Client" role badge, department badge | Badges displayed |
| 4 | Verify description, info items (company, languages, location, website, email) | All data displayed |
| 5 | Click **"DAO View"** | Navigate to `/profile/dao` |

**Membership NFT Card** (visible when user is a DAO member):

| Step | Action | Expected Result |
|------|--------|-----------------|
| 6 | Locate the **Membership NFT Card** below the profile card | Card with green gradient hexagonal artwork and "W3S" monogram |
| 7 | Verify **"Community Member"** title, **"Verified"** badge (green dot) | Both displayed |
| 8 | Verify **Membership ID** (`#N`), **Join Date**, and **Blockchain Address** | All three fields visible |
| 9 | Click the **blockchain address** | Address copied to clipboard, "Copied!" feedback shown briefly |

**Edit mode:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 10 | Click **"Edit Information"** | Switch to edit mode |
| 11 | Edit Name, Description, Company, Department, Website, Location | Inputs accept changes |
| 12 | Toggle language checkboxes | Checkboxes toggle |
| 13 | Click upload area for photo | File picker opens (max 2MB) |
| 14 | Click **"Save"** | Profile saved, returns to view mode |
| 15 | Click **"Cancel"** | Changes discarded, returns to view mode |

---

### Flow 21: Developer Availability (Sidebar Popover)

> **Login as: Developer**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click user section at the bottom of sidebar (avatar + name area) | Availability popover opens (516px panel) |
| 2 | Toggle **"Availability for Hire"** master switch | Immediate API save, switch toggles |
| 3 | Toggle **"Full Time"** switch | Immediate API save |
| 4 | Toggle **"Part Time"** switch | Immediate API save |
| 5 | Toggle **"Hours per Week"** switch | Immediate API save, number input appears |
| 6 | Enter hours in the number input (1-168) | Input accepted |
| 7 | Press Enter or click outside the input (blur) | Hours saved to API |
| 8 | Press **Escape** | Popover closes |
| 9 | Click outside the popover | Popover closes |

---

### Flow 22: DAO View

> Navigate to `/profile/dao` or click the **"DAO View"** button on any profile page.

**Page header:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profile/dao` (or click "DAO View" on profile) | Page loads (lazy-loaded, may show spinner briefly) |
| 2 | Verify **back arrow** button (top-left) | Click → navigate to `/profile` |
| 3 | Verify page title **"DAO View"** | Title displayed |
| 4 | Verify **blockchain address pill** next to the title | Truncated address shown (e.g. `5Grw...utQY`) |
| 5 | Verify **live indicator** (green pulsing dot) | Dot pulses, indicating real-time chain connection |

**Card 1 — Chain Explorer:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 6 | Locate the **"Chain Explorer"** card | Card displayed with blockchain data |
| 7 | Verify **Best Block** number | Large number displayed (e.g. `18,452,371`) — updates automatically |
| 8 | Verify **hexagonal timer** | Hexagonal shape showing seconds since last block (counts up live) |
| 9 | Verify **Finalized Block** number below best block | Finalized block number displayed |
| 10 | Verify **block grid** (6×5 matrix) | Color-coded blocks: solid = finalized, highlight = has events, bright = latest, dim = empty |
| 11 | Verify **recent events** feed (up to 4) | List of recent chain events with names and block numbers |
| 12 | Wait ~6 seconds | Data auto-refreshes (polling interval) |

**Card 2 — Communities:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 13 | Locate the **"Communities"** card | Card displayed with total count badge (e.g. "5 communities") |
| 14 | Verify community rows (up to 3 shown) | Each row: gradient circle avatar, community name, member count |
| 15 | Verify **status indicator** per community | Green dot = Active, Blue dot = Pending, Grey dot = Inactive |
| 16 | If more than 3 communities exist | **"+ N more"** label displayed at the bottom |

**Card 3 — Wallet:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 17 | Locate the **"Wallet"** card | Card displayed with balance information |
| 18 | Verify **total USD balance** (large headline) | Dollar amount displayed (e.g. `$1,234.56`) |
| 19 | Verify **summary row** below balance | Expandable row showing KSM amount · DUSD amount |
| 20 | Click the summary row to expand | **Breakdown** section appears: KSM amount/USD value, DUSD amount/USD value, KSM unit price |
| 21 | Click the **"Buy DUSD"** button | Inline **DusdOnRampFlow** panel opens within the card |
| 22 | Verify blockchain address at the bottom of the card | Full address displayed |

**Footer:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 23 | Click **"Open Kreivo Dashboard"** button at the bottom | Opens `https://kreivo.io` in a new tab |

---

### Flow 23: Projects List Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/projects` | Project list with filter dropdown |
| 2 | Verify **"New Project"** button (client only) | Visible for clients, hidden for developers |
| 3 | Click **"Filter by State"** dropdown | 10 filter options shown |
| 4 | Select **"In Progress"** | Only in-progress projects displayed |
| 5 | Select **"Completed"** | Only completed projects displayed |
| 6 | Select **"All States"** | All projects shown |
| 7 | Verify each project card shows | State badge, title, progress bar, pending task count |
| 8 | Click a project card | Navigate to `/projects/:id` |

---

### Complete Project Lifecycle Summary

```
CLIENT                          CONSULTANT                      DEVELOPER
  |                                |                               |
  |--- 1. Create Proposal -------->|                               |
  |                                |--- 2. Approve Proposal        |
  |                                |--- 3. Build Scope             |
  |<-- 4. Review Scope ------------|    (milestones + budget)       |
  |--- 5. Accept + Fund Escrow --->|                               |
  |                                |--- 6. Assign Team ----------->|
  |                                |                               |--- 7. Work on Milestone
  |                                |                               |--- 8. Submit for Review
  |--- 9. Review Milestone --------|------------------------------>|
  |    (Accept or Reject)          |                               |
  |                                |                       [If rejected: 7-9 repeat]
  |                                |                               |
  |--- 10. Evaluate Team -------->|                                |
  |    (star ratings)              |                               |
  |                                |--- 11. Rate Client + Team     |
  |                                |                               |--- 12. Rate Coordinator
  |--- 13. Release Payment ------>|                                |
  |                                |                               |--- 14. Claim Payment
  |                                |                               |
  DONE                            DONE                             DONE
```

---

### Role Summary: Who Can Do What

| Action | Client | Developer | Consultant |
|--------|:------:|:---------:|:----------:|
| Register / Login | Yes | Yes | Yes |
| Create new project | Yes | -- | -- |
| Approve/Reject proposal | -- | -- | Yes |
| Build/Revise scope (milestones) | -- | -- | Yes |
| Review & accept/reject scope | Yes | -- | -- |
| Fund escrow (bank transfer) | Yes | -- | -- |
| Assign team | -- | -- | Yes |
| Submit milestone for review | -- | Yes | Yes |
| Review milestone (accept/reject) | Yes | -- | -- |
| Evaluate team (star ratings) | Yes | -- | -- |
| Rate client + team | -- | -- | Yes |
| Rate coordinator | -- | Yes | -- |
| Release payment | Yes | -- | -- |
| Claim payment | -- | Yes | -- |
| Toggle availability for hire | -- | Yes | -- |
| Edit profile | Yes | Yes | Yes |
| View DAO data | Yes | Yes | Yes |

---

## :clipboard: TODOs

Concrete tasks ordered by estimated complexity. Each task includes context, files to consult, and acceptance criteria.

---

#### TODO 1: Complete the frontend `.env.example` file

- [ ] Completed

**What to do**: The file `frontend/.env.example` already exists but only documents `VITE_API_BASE_URL`. However, `frontend/.env.local` also uses `VITE_BACKEND_URL`. Your task is to review all the frontend source code, find **all** environment variables that are used (search for `import.meta.env.VITE_`), and document all of them in `.env.example` with clear comments.

**Why it matters**: When a new developer clones the project, the first thing they need is to know which environment variables to configure. If `.env.example` is incomplete, the developer wastes time figuring out why something is not working. A good `.env.example` saves hours of frustration.

**Files to consult**:
- `frontend/.env.example` (current file, incomplete)
- `frontend/.env.local` (has additional variables)
- `frontend/src/api/config.ts` (this is where `VITE_API_BASE_URL` is read)
- Search all of `frontend/src/` with: `grep -r "import.meta.env" frontend/src/`

**Acceptance criteria**:
1. `frontend/.env.example` contains ALL `VITE_*` variables used in the project
2. Each variable has a clear explanatory comment
3. Default values point to the development environment (`dev.abako.xyz`)
4. There are clear instructions at the top of the file on how to use it

**Example of the expected result**:

```bash
# ============================================================
# Variables de entorno para el frontend de Work3Spaces
# ============================================================
# Copia este archivo como .env y ajusta los valores:
#   cp .env.example .env
#
# Para desarrollo local normalmente no necesitas cambiar nada.
# ============================================================

# URL base para todas las APIs externas (Adapter, Virto, Contracts).
# Las 3 APIs viven bajo este dominio.
# En desarrollo: https://dev.abako.xyz
# En produccion: https://abako.xyz (cuando exista)
VITE_API_BASE_URL=https://dev.abako.xyz

# URL del backend Express (solo necesario si usas el backend como proxy).
# Dejalo vacio si el frontend se conecta directamente a las APIs.
VITE_BACKEND_URL=https://dev.abako.xyz
```

---

#### TODO 2: Add informative tooltips to project state badges

- [ ] Completed

**What to do**: The `ProjectStateBadge` component displays a colored label for each project state (for example "Proposal Pending" in yellow). It currently does not explain what each state means. Your task is to add a `title` attribute to the badge's `<span>` so that when the user hovers over it, they see a Spanish description of what that state means.

**Why it matters**: New users do not know what "Scope Validation Needed" or "Awaiting Team Assignment" means. A tooltip with a brief explanation saves them from having to read the documentation. It is a small change that greatly improves the user experience.

**Files to consult**:
- `frontend/src/components/shared/ProjectStateBadge.tsx` (the component to modify)
- `frontend/src/lib/flowStates.ts` (definitions of each state with English comments explaining their meaning)

**Acceptance criteria**:
1. Each project state has a `title` with a Spanish description
2. The `title` is displayed as the browser's native tooltip on hover
3. The descriptions are brief (1 line) and clear for a non-technical user
4. The component still renders exactly the same visually (only the tooltip is added)

**Example of the change**:

```typescript
// 1. Create a new Record with the descriptions:
const STATE_TOOLTIPS: Record<ProjectStateValue, string> = {
  [ProjectState.CreationError]: 'Ocurrio un error al crear la propuesta del cliente',
  [ProjectState.ProposalPending]: 'La propuesta fue enviada y esta esperando que la DAO asigne un consultor',
  [ProjectState.WaitingForProposalApproval]: 'Un consultor fue asignado y debe aceptar o rechazar la propuesta',
  [ProjectState.ProposalRejected]: 'El consultor rechazo la propuesta del cliente',
  [ProjectState.ScopingInProgress]: 'El consultor esta definiendo el alcance y los hitos del proyecto',
  [ProjectState.ScopeValidationNeeded]: 'El alcance fue enviado y espera la validacion del cliente',
  [ProjectState.ScopeRejected]: 'El cliente rechazo el alcance propuesto',
  [ProjectState.WaitingForTeamAssigment]: 'El alcance fue aprobado, falta asignar al equipo de desarrollo',
  [ProjectState.ProjectInProgress]: 'El equipo esta trabajando en los hitos del proyecto',
  [ProjectState.PaymentReleased]: 'El pago fue liberado al equipo',
  [ProjectState.Completed]: 'El proyecto fue completado, evaluado y pagado',
  [ProjectState.Invalid]: 'Estado no reconocido',
};

// 2. Use the tooltip in the JSX:
<span
  className={cn('inline-flex items-center ...', colors, className)}
  title={STATE_TOOLTIPS[state]}  // <-- This line is new
>
  {label}
</span>
```

---

#### TODO 3: Create constants for success messages in mutation hooks

- [ ] Completed

**What to do**: Currently, the React Query hooks have success messages written directly in the code (hardcoded), like `'Scope accepted successfully'` or `'Milestone submitted successfully'`. Your task is:
1. Create a new file `frontend/src/constants/messages.ts`
2. Define all message constants there
3. Import and use those constants in the hooks that need them

**Why it matters**: Hardcoded strings are difficult to maintain. If tomorrow we want to change a message, we would have to search across 10 different files. With a centralized file, we change a single line and it updates everywhere. Additionally, this paves the way for future internationalization (i18n).

**Files to consult**:
- `frontend/src/hooks/useScope.ts` (3 messages: submitted, accepted, rejected)
- `frontend/src/hooks/useMilestones.ts` (3 messages: submitted, accepted, rejected)
- `frontend/src/hooks/useVotes.ts` (1 message: submitted)
- `frontend/src/hooks/usePayments.ts` (1 message: released)
- `frontend/src/hooks/useProjects.ts` (1 message: proposal rejected)
- `frontend/src/hooks/useProfile.ts` (1 message: image uploaded)
- `frontend/src/constants/languages.ts` (an existing constants file; use it as a style reference)

**Acceptance criteria**:
1. `frontend/src/constants/messages.ts` exists with all the constants
2. Hooks import the constants instead of using hardcoded strings
3. `grep -rn "successfully" frontend/src/hooks/` returns no results
4. The application works exactly the same

**Example of the file to create**:

```typescript
// frontend/src/constants/messages.ts

/**
 * Centralized success and error messages.
 */

// --- Scope ---
export const SCOPE_SUBMITTED = 'Scope submitted successfully';
export const SCOPE_ACCEPTED = 'Scope accepted successfully';
export const SCOPE_REJECTED = 'Scope rejected successfully';

// --- Milestones ---
export const MILESTONE_SUBMITTED = 'Milestone submitted for review';
export const MILESTONE_ACCEPTED = 'Milestone accepted successfully';
export const MILESTONE_REJECTED = 'Milestone rejected';

// --- Voting ---
export const VOTES_SUBMITTED = 'Votes submitted successfully';

// --- Payments ---
export const PAYMENT_RELEASED = 'Payment released successfully';

// --- Proposals ---
export const PROPOSAL_REJECTED = 'Proposal rejected';

// --- Profile ---
export const PROFILE_IMAGE_UPLOADED = 'Profile image uploaded successfully';
```

**Example of how it is used in a hook**:

```typescript
// frontend/src/hooks/useScope.ts (BEFORE)
return { projectId, message: 'Scope submitted successfully' };

// frontend/src/hooks/useScope.ts (AFTER)
import { SCOPE_SUBMITTED } from '@/constants/messages';
// ...
return { projectId, message: SCOPE_SUBMITTED };
```

---

#### TODO 4: Add descriptive meta tags to the frontend index.html file

- [ ] Completed

**What to do**: The file `frontend/index.html` has the bare minimum: a `<title>`, a favicon, and the viewport. Your task is to add meta tags for SEO and social media (Open Graph), change `lang` from `"en"` to `"es"`, and improve the title.

**Why it matters**: When someone shares a Work3Spaces link on Slack, Twitter, or WhatsApp, a preview with the title and description is shown. Without meta tags, the preview appears empty or unattractive. Additionally, the `lang="en"` attribute is incorrect because the app is in Spanish, and screen readers (accessibility) use this attribute.

**Files to consult**:
- `frontend/index.html` (the file to modify)
- `frontend/src/main.tsx` (to verify there is no title configuration there)

**Acceptance criteria**:
1. `<html lang="es">` instead of `<html lang="en">`
2. `<title>` reads "Work3Spaces - Marketplace Descentralizado para Freelancers"
3. There is a `description` meta tag with a brief project description
4. There are Open Graph meta tags (`og:title`, `og:description`, `og:type`)
5. The favicon still works

**Example of the change**:

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- SEO -->
    <title>Work3Spaces - Marketplace Descentralizado para Freelancers</title>
    <meta name="description" content="Plataforma descentralizada para conectar freelancers con clientes, construida sobre Polkadot y Virto Network. Gestiona proyectos, hitos y pagos con transparencia blockchain." />

    <!-- Open Graph (social media previews) -->
    <meta property="og:title" content="Work3Spaces - Marketplace Descentralizado" />
    <meta property="og:description" content="Conecta con freelancers y gestiona proyectos de forma transparente con tecnologia blockchain." />
    <meta property="og:type" content="website" />

    <!-- Icons and fonts -->
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.5.0/fonts/remixicon.css" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

#### TODO 5: Document the exported functions in services/index.ts with JSDoc

- [ ] Completed

**What to do**: The file `frontend/src/services/index.ts` re-exports all service functions, but has no documentation about what each function does. Your task is to add brief JSDoc comments grouped by category, so that any developer can understand what each function does without having to open the source file.

**Why it matters**: This file is the "index" of everything the frontend can do with the APIs. A new developer arrives and sees 40+ exported functions with no explanation. With clear comments grouped by section, they can quickly find what they need. Additionally, code editors (like VS Code) display JSDoc comments on hover, which speeds up development.

**Files to consult**:
- `frontend/src/services/index.ts` (the file to modify)
- `frontend/src/services/projectService.ts` (to understand what each project function does)
- `frontend/src/services/clientService.ts` (client functions)
- `frontend/src/services/developerService.ts` (developer functions)
- `frontend/src/services/milestoneService.ts` (milestone functions)
- `frontend/src/services/scopeService.ts` (scope functions)
- `frontend/src/services/calendarService.ts` (calendar functions)

**Acceptance criteria**:
1. Each group of exports has a descriptive section comment in Spanish
2. Each exported function has a one-line JSDoc comment explaining what it does
3. Comments are concise (maximum 1-2 lines per function)
4. The file still compiles without errors (`npm run build` passes)

**Example of the change**:

```typescript
// frontend/src/services/index.ts

/**
 * Service Barrel Export
 *
 * Single entry point for all service functions.
 * Services encapsulate business logic over raw API calls.
 *
 * Usage:
 *   import { getProject, createProposal, clientConnect } from '@/services';
 */

// ===================================================================
// Project - Queries, updates, and actions on projects
// ===================================================================

export {
  /** Obtiene los datos completos de un proyecto por su ID. */
  getProject,
  /** Obtiene la lista de proyectos (filtrable por cliente o developer). */
  getProjectsIndex,
  /** Obtiene el ID del cliente asociado a un proyecto. */
  getProjectClientId,
  /** Obtiene el ID del consultor asignado a un proyecto. */
  getProjectConsultantId,
  // ... etc
} from './projectService';
```

> **Tip**: Open each service file, read the function, and write one line summarizing what it does. You do not need to understand all the details, just the general purpose.

---

#### TODO 6: Add loading spinners to all frontend pages

**What to do**: Review the frontend pages (`frontend/src/pages/`) and ensure they all display a spinner (loading indicator) while waiting for data from the external APIs, and an error message when the request fails.

**Why it matters**: Without a loading indicator, the user sees a blank page and thinks the application is broken. A spinner tells them "I am loading, please wait." Similarly, a clear error message tells them something went wrong and they can retry.

**Files to consult**:
- `frontend/src/components/ui/Spinner.tsx` (existing Spinner component)
- `frontend/src/components/shared/LoadingScreen.tsx` (full loading screen)
- `frontend/src/pages/dashboard/DashboardPage.tsx` (page to review)
- `frontend/src/pages/projects/ProjectsPage.tsx` (page to review)
- `frontend/src/pages/payments/PaymentsPage.tsx` (page to review)

**Acceptance criteria**:
- [ ] Each page that uses `useQuery` displays a `<Spinner />` or `<LoadingScreen />` during `isLoading`
- [ ] The spinner is centered vertically and horizontally on the screen
- [ ] The existing `Spinner` component is used (do not create a new one)
- [ ] There is a visible error message when `isError` is true
- [ ] `npm run type-check` passes without errors

**Pattern to follow**:
```tsx
import { Spinner } from '@/components/ui';
import { useProjects } from '@/hooks/useProjects';

function MyPage() {
  const { data, isLoading, isError, error } = useProjects();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return <p className="text-red-500">Error: {error.message}</p>;
  }

  return <div>{/* normal content */}</div>;
}
```

---

#### TODO 7: Write unit tests for the `flowStates` state machine

**What to do**: Create a test file for `frontend/src/lib/flowStates.ts` that verifies each state transition works correctly.

**What is a unit test**: It is a piece of code that automatically verifies that a function behaves as expected. For example: "if the project is in ProposalPending state and it is approved, it should move to ScopingInProgress."

**Why it matters**: The state machine is the heart of the business logic. If a state is calculated incorrectly, the user sees incorrect buttons or cannot advance in the flow. Tests prevent regressions (something that used to work stops working).

**Files to consult**:
- `frontend/src/lib/flowStates.ts` (the state machine to test)
- `backend/models/flowStates.js` (original JavaScript version, for comparison)
- `.context/PROJECT_ANALYSIS.md` (section 5: State Machines, describes all flows)

**Acceptance criteria**:
- [ ] A file `frontend/src/lib/__tests__/flowStates.test.ts` (or similar) exists
- [ ] All ProjectState transitions are tested (at least 8 transitions)
- [ ] All MilestoneState transitions are tested (at least 5 transitions)
- [ ] Edge cases are tested: invalid state, disallowed transition
- [ ] All tests pass with `npm test` (may need to configure Vitest first)

> **Note**: If Vitest is not configured yet, this TODO includes installing and configuring it. You can follow the [Vitest](https://vitest.dev/guide/) guide.

---

#### TODO 8: Add unit tests for the permission functions

**What to do**: Create tests for `frontend/src/lib/permissions.ts` that verify each permission function returns the correct value based on the user and context.

**What is `permissions.ts`**: These are pure functions that determine whether a user can perform an action. For example: "only the client who proposed the project can approve the scope" or "only the assigned consultant can create milestones."

**Why it matters**: Permissions define the application's security. If `isProjectClient` returns `true` for a user who is not the client, that user could approve a scope that does not belong to them. Tests ensure this does not happen.

**Files to consult**:
- `frontend/src/lib/permissions.ts` (7 functions + 1 compound function)
- `frontend/src/types/user.ts` (the `User` type received by the functions)
- `backend/controllers/permission.js` (original version for comparison)

**Acceptance criteria**:
- [ ] A file `frontend/src/lib/__tests__/permissions.test.ts` exists
- [ ] All 7 functions are tested: `isClient`, `isDeveloper`, `isClientSelf`, `isDeveloperSelf`, `isProjectClient`, `isProjectConsultant`, `isMilestoneDeveloper`
- [ ] The compound function `checkPermission` is tested with multiple combinations
- [ ] Cases with `user = null` (not authenticated) are tested
- [ ] All tests pass

**Test example**:
```typescript
import { describe, it, expect } from 'vitest';
import { isClient, isDeveloper, checkPermission } from '../permissions';
import type { User } from '@/types';

const clientUser: User = { clientId: 'client-1', name: 'Ana' } as User;
const devUser: User = { developerId: 'dev-1', name: 'Carlos' } as User;

describe('isClient', () => {
  it('returns true for a user with clientId', () => {
    expect(isClient(clientUser)).toBe(true);
  });
  it('returns false for a developer', () => {
    expect(isClient(devUser)).toBe(false);
  });
  it('returns false for null', () => {
    expect(isClient(null)).toBe(false);
  });
});
```

---

#### TODO 9: Improve the ErrorBoundary component

**What to do**: Improve the existing `ErrorBoundary.tsx` to display a friendly message, a "Retry" button, and log the error to the console. Ensure it properly wraps the key sections of the application.

**What is an Error Boundary**: It is a React component that "catches" errors in its children. Without it, an error in a component breaks the ENTIRE page. With it, only the affected section shows an error message and the rest of the app keeps working.

**Why it matters**: In production, an uncaught error shows a blank screen. An Error Boundary shows a friendly message and can offer a "retry" button.

**Files to consult**:
- `frontend/src/components/shared/ErrorBoundary.tsx` (existing implementation)
- `frontend/src/App.tsx` (where boundaries should be placed)
- `frontend/src/components/layouts/AppLayout.tsx` (another key placement point)

**Acceptance criteria**:
- [ ] The `ErrorBoundary` displays a friendly (non-technical) error message
- [ ] Includes a "Retry" button that clears the error and re-renders
- [ ] At minimum, it wraps: the main layout content, each individual page
- [ ] The error is logged with `console.error` for debugging
- [ ] Works with asynchronous errors (combined with React Query `ErrorBoundary`)

---

#### TODO 10: Add form validation with Zod schemas

**What to do**: Create Zod validation schemas for the frontend forms and connect them with React Hook Form using `@hookform/resolvers`.

**What is Zod**: A validation library that lets you define "the shape" your data must have. For example: "the name is a string of at least 2 characters and the email must be in email format."

**Why it matters**: Without validation, a user can submit an empty form or one with incorrect data, causing errors in the external APIs. Frontend validation provides immediate feedback before submission.

**Files to consult**:
- `frontend/package.json` (Zod and `@hookform/resolvers` are already installed)
- `frontend/src/pages/projects/CreateProjectPage.tsx` (create project form)
- `frontend/src/pages/auth/ClientRegisterPage.tsx` (registration form)
- `frontend/src/types/project.ts` (existing types to base schemas on)
- `frontend/src/types/enums.ts` (option constants: BUDGETS, PROJECT_TYPES, etc.)

**Acceptance criteria**:
- [ ] At least 2 forms have complete Zod validation
- [ ] Error messages are in Spanish and user-friendly
- [ ] Required fields, formats, and minimum/maximum lengths are validated
- [ ] Errors are displayed below each field (not as a generic alert)
- [ ] Zod schemas are in separate files (e.g.: `frontend/src/lib/schemas/`)

**Example**:
```typescript
import { z } from 'zod';
import { BUDGETS, DELIVERY_TIMES, PROJECT_TYPES } from '@/types/enums';

export const createProjectSchema = z.object({
  title: z.string()
    .min(5, 'El titulo debe tener al menos 5 caracteres')
    .max(100, 'El titulo no puede superar 100 caracteres'),
  description: z.string()
    .min(20, 'La descripcion debe tener al menos 20 caracteres'),
  budget: z.enum(BUDGETS, {
    errorMap: () => ({ message: 'Debes seleccionar un presupuesto' }),
  }),
  deliveryTime: z.enum(DELIVERY_TIMES, {
    errorMap: () => ({ message: 'Debes seleccionar un tiempo de entrega' }),
  }),
  projectType: z.enum(PROJECT_TYPES, {
    errorMap: () => ({ message: 'Debes seleccionar un tipo de proyecto' }),
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
```

---

#### TODO 11: Create Storybook stories for the UI components

**What to do**: Install Storybook and create stories for the existing components in `frontend/src/components/ui/` (Button, Card, Input, Label, Spinner).

**What is Storybook**: It is a tool that allows developing and testing components in isolation, outside of the application. Each "story" shows a variant of the component (primary button, disabled button, danger button, etc.).

**Why it matters**: It allows viewing all design system components in one place, testing variants without navigating through the entire app, and serves as visual documentation for the team.

**Files to consult**:
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Card.tsx`
- `frontend/src/components/ui/Input.tsx`
- `frontend/src/components/ui/Label.tsx`
- `frontend/src/components/ui/Spinner.tsx`

**Acceptance criteria**:
- [ ] Storybook is installed and works with `npm run storybook`
- [ ] Each component in `ui/` has at least 3 stories (different variants)
- [ ] Stories show all possible props of the component
- [ ] Stories for states are included: default, hover, disabled, loading
- [ ] Basic documentation is included in each story (usage description)

---

#### TODO 12: Add integration tests for the services

**What to do**: Create tests for the services in `frontend/src/services/` that verify data composition works correctly. Use mocks for the API layer functions.

**What is an integration test**: Unlike a unit test (which tests an isolated function), an integration test verifies that multiple pieces work together. In this case, we verify that a service calls the correct API functions and composes the expected data.

**Why it matters**: Services are the most critical layer of the application. If `getProject` does not correctly aggregate milestones, the detail page shows incomplete data. Tests with mocks allow testing the logic without depending on external APIs.

**Files to consult**:
- `frontend/src/services/projectService.ts` (the `getProject` function is ideal for testing)
- `frontend/src/services/clientService.ts` (simpler functions to start with)
- `frontend/src/api/adapter/index.ts` (functions that need to be mocked)

**Acceptance criteria**:
- [ ] At least 2 services have integration tests
- [ ] API functions are mocked (no real HTTP calls are made)
- [ ] It is tested that `getProject` aggregates project + client + consultant + milestones
- [ ] It is tested that `getProjectsIndex` uses `Promise.allSettled` and does not fail if a request fails
- [ ] All tests pass with `npm test`

**Example**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { getProject } from '../projectService';

// Mock the API module
vi.mock('@/api/adapter', () => ({
  getProjectInfo: vi.fn().mockResolvedValue({
    _id: 'proj-1', clientId: 'client-1', consultantId: 'dev-1', creationStatus: 'created',
  }),
  getClients: vi.fn().mockResolvedValue({
    clients: [{ id: 'client-1', name: 'Ana' }],
  }),
  getDevelopers: vi.fn().mockResolvedValue({
    developers: [{ id: 'dev-1', name: 'Carlos' }],
  }),
  getAllTasks: vi.fn().mockResolvedValue({
    milestones: [{ _id: 'm-1', title: 'Hito 1', developerId: 'dev-1' }],
  }),
}));

describe('getProject', () => {
  it('aggregates client, consultant, and milestones into the project', async () => {
    const project = await getProject('proj-1');
    expect(project.client?.name).toBe('Ana');
    expect(project.consultant?.name).toBe('Carlos');
    expect(project.milestones).toHaveLength(1);
  });
});
```

---

#### TODO 13: Implement pagination and search in the project list

**What to do**: Add client-side pagination and a search field to the `ProjectsPage.tsx` page. Since the external API does not support native pagination, the implementation will be on the frontend: all projects are loaded once and paginated/filtered locally.

**Why it matters**: Currently ALL projects are displayed at once. With 100+ projects, the page will be slow and hard to navigate. Pagination shows only a portion (e.g., 10 projects at a time) and search allows quickly finding a specific project.

**Files to consult**:
- `frontend/src/pages/projects/ProjectsPage.tsx` (page to modify)
- `frontend/src/hooks/useProjects.ts` (hook that fetches data)
- `frontend/src/services/projectService.ts` (service that loads projects)

**Acceptance criteria**:
- [ ] The page displays 10 projects at a time (configurable)
- [ ] Pagination controls exist (previous/next, page numbers)
- [ ] The search field filters by project title or description
- [ ] React Query maintains the cache correctly
- [ ] The experience is smooth (no flickering or reloads)

---

#### TODO 14: Complete the Dashboard pages with real data

**What to do**: Connect `DashboardPage.tsx` with the React Query hooks so that it displays real data from the external APIs: count of active projects, pending milestones, recent payments, and summary by state.

**Why it matters**: The dashboard is the first page a user sees when they log in. It may currently be showing placeholder data. Connecting it with real data is fundamental for the application to be functional.

**Files to consult**:
- `frontend/src/pages/dashboard/DashboardPage.tsx` (page to complete)
- `frontend/src/hooks/useProjects.ts` (project data)
- `frontend/src/hooks/usePayments.ts` (payment data)
- `frontend/src/services/projectService.ts` (the `getProjectsIndex` function)
- `frontend/src/lib/flowStates.ts` (for grouping projects by state)

**Acceptance criteria**:
- [ ] The dashboard displays a real count of projects by state (pending, in progress, completed)
- [ ] Shows the last 5 projects with links to their detail page
- [ ] Shows milestones pending review (if consultant) or pending approval (if client)
- [ ] Correctly handles loading and error states
- [ ] The view differs between client and developer using `permissions.ts`

---

#### TODO 15: Add E2E (End-to-End) tests with Playwright

**What to do**: Configure Playwright and implement tests that simulate a complete user flow: register, view the project list, navigate to a project's detail, etc.

**What is an E2E test**: Unlike a unit test (which tests an isolated function), an E2E test opens a real browser, clicks buttons, fills in forms, and verifies the page displays what is expected. It simulates a real user.

**Why it matters**: It is the only way to verify that all components work correctly together: navigation, data loading, permissions, forms, etc. A unit test can pass but the app can still be broken if the components do not integrate well.

**Files to consult**:
- `frontend/src/App.tsx` (application routes)
- `frontend/src/pages/auth/LoginPage.tsx` (first flow to test)
- `frontend/src/pages/projects/ProjectsPage.tsx` (second flow to test)
- [Playwright documentation](https://playwright.dev/docs/intro)

**Acceptance criteria**:
- [ ] Playwright is installed and configured
- [ ] A script `npm run test:e2e` exists in the frontend
- [ ] At least 3 E2E flows are implemented: login, view projects, navigate to detail
- [ ] Tests can be run against the development environment (`dev.abako.xyz`)
- [ ] Documentation on how to run the tests is included

---

#### TODO 16: Implement Zustand devtools and state monitoring

**What to do**: Add debugging tools for Zustand state: integrate with Redux DevTools Extension, add development logging, and create a second store if needed (for example `uiStore` for interface state like sidebar open/closed, theme, etc.).

**Why it matters**: As the application grows, it is important to be able to inspect global state for debugging issues. Zustand supports Redux DevTools, which allows viewing the history of state changes in the browser.

**Files to consult**:
- `frontend/src/stores/authStore.ts` (existing store as reference)
- [Zustand middleware documentation](https://github.com/pmndrs/zustand#devtools)

**Acceptance criteria**:
- [ ] `authStore` is connected to Redux DevTools (visible in the browser extension)
- [ ] Conditional logging is added in development (`import.meta.env.DEV`)
- [ ] A `uiStore.ts` is created if there is repeated UI state across multiple components
- [ ] `npm run type-check` passes without errors

---

#### TODO 17: Review and adjust the UI design to match the Figma mockups

- [ ] Completed

**What to do**: Compare every page and component in the frontend against the original Figma designs and fix any visual discrepancies. This includes spacing, typography, colors, component sizing, layout alignment, responsive breakpoints, and any missing UI elements. The goal is pixel-level fidelity with the Figma source of truth.

**Why it matters**: During the migration from EJS to React, the focus was on functional correctness (data flow, API calls, state management). Visual styling was implemented with Tailwind utility classes but was not systematically compared against the Figma designs. The current UI may have misaligned elements, incorrect spacing, wrong color shades, or missing visual details that affect the professional look and feel of the product.

**Files to consult**:
- The Figma project (ask the team lead for the link if you do not have access)
- `frontend/src/components/layouts/AppLayout.tsx` (main layout: sidebar + header + content area)
- `frontend/src/components/layouts/Sidebar.tsx` (navigation sidebar)
- `frontend/src/components/layouts/Header.tsx` (top header bar)
- `frontend/src/components/layouts/AuthLayout.tsx` (login/register layout)
- `frontend/src/components/ui/` (Button, Card, Input, Label, Spinner — design system primitives)
- `frontend/src/pages/dashboard/DashboardPage.tsx` (dashboard)
- `frontend/src/pages/projects/ProjectsPage.tsx` (project list)
- `frontend/src/pages/projects/ProjectDetailPage.tsx` (project detail)
- `frontend/src/pages/projects/CreateProjectPage.tsx` (create project form)
- `frontend/src/pages/payments/PaymentsPage.tsx` (payments list)
- `frontend/src/pages/profiles/ClientProfilePage.tsx` (client profile)
- `frontend/src/pages/profiles/DeveloperProfilePage.tsx` (developer profile)
- `frontend/src/pages/auth/LoginPage.tsx` (login page)
- `frontend/src/pages/auth/ClientRegisterPage.tsx` (client registration)
- `frontend/src/pages/auth/DeveloperRegisterPage.tsx` (developer registration)
- `frontend/tailwind.config.js` (Tailwind theme: colors, fonts, breakpoints)

**Acceptance criteria**:
- [ ] Every page has been compared side-by-side with its Figma counterpart
- [ ] Colors, typography (font family, size, weight), and spacing match the Figma design tokens
- [ ] Layout structure (sidebar width, header height, content margins) matches the mockups
- [ ] UI components (buttons, cards, inputs, badges) match the Figma component library
- [ ] Responsive behavior (mobile, tablet, desktop) follows the Figma breakpoints
- [ ] Any missing visual elements from Figma (icons, dividers, shadows, hover states) are added
- [ ] `npm run build` passes without errors

---

## Contributing to the Project

### Git workflow

```bash
# 1. Make sure you have the latest version of the main branch
git checkout feature/web-refactor
git pull origin feature/web-refactor

# 2. Create a new branch for your task
git checkout -b type/short-description
# Examples:
#   fix/loading-spinners-all-pages
#   feat/zod-validation-create-project
#   test/flow-states-unit-tests

# 3. Make your changes and commit frequently
git add .
git commit -m "type: description of the change"

# 4. Push your branch to the remote repository
git push origin type/short-description

# 5. Create a Pull Request (PR) in the git web interface
```

### Commit conventions

We use the [Conventional Commits](https://www.conventionalcommits.org/) format:

| Prefix | When to use it | Example |
|--------|----------------|---------|
| `feat:` | New feature | `feat: add Zod validation to CreateProjectPage` |
| `fix:` | Bug fix | `fix: add missing loading spinner to DashboardPage` |
| `docs:` | Documentation only | `docs: update README with new architecture` |
| `style:` | Formatting, no logic change | `style: fix indentation in ProjectActions.tsx` |
| `refactor:` | Code change without altering functionality | `refactor: extract error handling to shared util` |
| `test:` | Adding or fixing tests | `test: add unit tests for flowStates transitions` |
| `chore:` | Maintenance tasks | `chore: install and configure Storybook` |

### Checklist before creating a PR

- [ ] The code compiles without errors (`npm run build` in frontend)
- [ ] Types are correct (`npm run type-check` in frontend)
- [ ] The linter passes with no warnings (`npm run lint`)
- [ ] Tests pass (if tests are configured)
- [ ] The PR has a clear description of what changes and why
- [ ] Key modified files are mentioned

### Structure of a good PR

```markdown
## What changes
- Adds Zod validation to the CreateProjectPage form
- Creates schemas in src/lib/schemas/createProject.ts

## Why
- Without validation, empty forms can be submitted causing 400 errors

## How to test
1. Go to /projects/new
2. Try to submit the form empty -> errors should appear on each field
3. Fill in correctly -> should submit without issues

## Key files
- frontend/src/lib/schemas/createProject.ts (NEW)
- frontend/src/pages/projects/CreateProjectPage.tsx (MODIFIED)
```

## Useful Links

### About the blockchain ecosystem

| Resource | URL | Description |
|----------|-----|-------------|
| Polkadot | [polkadot.network](https://polkadot.network/) | Network of blockchains where the project lives |
| Virto Network | [virto.network](https://virto.network/) | Commerce blockchain with payment tools |
| WebAuthn | [webauthn.guide](https://webauthn.guide/) | Guide on passwordless authentication |

### About frontend technologies

| Resource | URL | Description |
|----------|-----|-------------|
| React | [react.dev](https://react.dev/) | Official React documentation |
| TypeScript | [typescriptlang.org](https://www.typescriptlang.org/docs/) | TypeScript manual |
| Vite | [vitejs.dev](https://vitejs.dev/) | Vite documentation |
| TailwindCSS | [tailwindcss.com/docs](https://tailwindcss.com/docs) | Tailwind documentation |
| TanStack Query | [tanstack.com/query](https://tanstack.com/query/latest) | React Query documentation |
| Zustand | [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand) | Zustand documentation |
| Zod | [zod.dev](https://zod.dev/) | Zod documentation |
| React Hook Form | [react-hook-form.com](https://react-hook-form.com/) | React Hook Form documentation |
| React Router | [reactrouter.com](https://reactrouter.com/) | React Router documentation |
| Axios | [axios-http.com](https://axios-http.com/) | HTTP client |
| Vitest | [vitest.dev](https://vitest.dev/) | Testing framework for Vite |
| Playwright | [playwright.dev](https://playwright.dev/) | E2E testing framework |
| Storybook | [storybook.js.org](https://storybook.js.org/) | Component development tool |

---

<p align="center">
  <sub>Developed with <a href="https://virto.network/">Virto Network</a> on <a href="https://polkadot.network/">Polkadot</a></sub>
</p>
