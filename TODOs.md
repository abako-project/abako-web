# Abako Frontend Task Backlog -- By Skill Level
## Branch: `feature/research-tasks-tse`

> Generated: 2026-03-06 | Reorganized by skill level: 2026-03-16
> Estimation scale: Fibonacci (1, 2, 3, 5, 8, 13)

---

## Level Legend
- **Low** (Becarios/Interns) -- Simple, mechanical, well-scoped tasks
- **Medium** (Junior Developers) -- Defined tasks requiring React knowledge and judgment
- **Advance** (Senior Developers) -- Complex architecture, security, and system design

---

# P0 -- Critical Issues from Product Audit (62 points, 8 features)

> These issues MUST be fixed before production. Source: `.context/PRODUCT_AUDIT_REPORT.md`
> They are classified by skill level but ALL have P0 priority regardless of level.

## P0 Medium (10 points, 3 features)

- [ ] **P0-SCOPE-01: Replace hardcoded documentHash in useSubmitScope (3 points)** -- Medium
  - *Why this level:* Requires understanding SHA-256 hashing and scope data serialization, but the scope of the change is well-defined and localized.
  - *Priority:* **P0 - CRITICAL** (Must fix before production)
  - **File(s):** `frontend/src/hooks/useScope.ts:47`
  - **What:** All scope submissions use the same fake document hash `'0x1234567890abcdef...'`. On-chain verification of scope documents is impossible. Generate a proper hash from the scope document content (SHA-256 of the serialized milestones).
  - **Why:** This is a placeholder that directly undermines the integrity of the on-chain scope verification system. In a dispute, neither party can prove what was agreed upon.
  - **Acceptance criteria:**
    - Document hash is computed from actual milestone data (titles, descriptions, budgets, delivery dates)
    - Hash changes when any milestone property changes
    - Hash is deterministic (same input produces same output)
    - Unit test covers hash computation with known inputs
  - **Story points:** 3

- [ ] **P0-SCOPE-02: Fix hardcoded advancePaymentPercentage mismatch (5 points)** -- Medium
  - *Why this level:* Requires tracing a value through the scope and payment flows, but the fix is well-defined: make it configurable and consistent.
  - *Priority:* **P0 - CRITICAL** (Must fix before production)
  - **File(s):** `frontend/src/hooks/useScope.ts:48` (hardcoded `100`), `frontend/src/hooks/usePayments.ts` (hardcoded `25`)
  - **What:** The scope submission always requests 100% advance payment, while the payment system assumes 25%. This mismatch means the actual payment terms are unpredictable. Make advancePaymentPercentage a user-configurable field in the ScopeBuilder form.
  - **Why:** Financial inconsistency in a payment platform is the highest severity issue. Two contradictory values for the same concept.
  - **Acceptance criteria:**
    - Single source of truth for advance payment percentage per project
    - Value configurable in ScopeBuilder form (default to business-defined value)
    - `useScope.ts` and `usePayments.ts` use the same value from project data
    - Validation: 0-100 range, integer
    - Unit test covers validation and flow consistency
  - **Story points:** 5

- [ ] **P0-PAY-04: Add payment release confirmation dialog (2 points)** -- Medium
  - *Why this level:* Straightforward UI component (confirmation modal) with no architectural complexity.
  - *Priority:* **P0 - CRITICAL** (Must fix before production)
  - **File(s):** `frontend/src/hooks/usePayments.ts` (`useReleasePayment`)
  - **What:** Releasing a payment sends funds irreversibly. There is no confirmation step. Add a confirmation modal showing the exact amount, recipient, and a clear "This action cannot be undone" warning.
  - **Why:** Accidental payment release cannot be reversed on blockchain. A single misclick causes irreversible financial loss.
  - **Acceptance criteria:**
    - Confirmation modal shows: amount, recipient, "This action cannot be undone" warning
    - Modal requires explicit "Confirm Release" click (not just Enter key)
    - Cancel button returns to previous state with no side effects
    - Loading state on confirm button while transaction processes
  - **Story points:** 2

## P0 Advance (52 points, 5 features)

- [ ] **P0-REG-07: Implement credential recovery flow (13 points)** -- Advance
  - *Why this level:* Requires deep understanding of WebAuthn, blockchain identity, and security architecture. Multiple recovery strategies must be evaluated.
  - *Priority:* **P0 - CRITICAL** (Must fix before production)
  - **File(s):** All auth pages, new recovery flow components
  - **What:** Users who lose access to their WebAuthn authenticator (e.g., lost phone) have no way to recover their account. Design and implement a credential recovery flow.
  - **Why:** For a financial platform, account recovery is essential. Loss of authenticator = permanent loss of access to funds and projects.
  - **Acceptance criteria:**
    - At least one recovery mechanism implemented (backup WebAuthn key, email-based recovery with admin approval, or social recovery via DAO)
    - Recovery flow accessible from login page
    - Rate limiting on recovery attempts
    - Audit trail of recovery events
    - Documentation of the chosen recovery strategy (ADR)
  - **Story points:** 13

- [ ] **P0-REG-09: Implement token refresh mechanism (5 points)** -- Advance
  - *Why this level:* Requires understanding of token lifecycle, 401 interceptors, request queuing, and WebAuthn re-authentication. Cross-cutting concern that touches the entire API layer.
  - *Priority:* **P0 - CRITICAL** (Must fix before production)
  - **File(s):** `frontend/src/hooks/useAuth.ts`, `frontend/src/api/adapter/client.ts`
  - **What:** When the auth token expires mid-session, all API calls fail silently or with cryptic errors instead of gracefully re-authenticating. Implement token refresh logic in the API interceptor.
  - **Why:** Users lose work in progress (e.g., a scope draft) when their session expires. Silent failures erode trust.
  - **Acceptance criteria:**
    - 401 response interceptor attempts token refresh via WebAuthn
    - Failing requests queued during refresh, retried with new token
    - If refresh fails, redirect to login with clear message
    - No request storms during refresh (single refresh attempt)
    - User's in-progress work preserved across refresh
  - **Story points:** 5

- [ ] **P0-REG-10: Move auth token from localStorage to httpOnly cookie (8 points)** -- Advance
  - *Why this level:* Requires backend coordination (cookie setting endpoint), CSRF protection, and changes across the entire API client layer. Security-critical.
  - *Priority:* **P0 - CRITICAL** (Must fix before production)
  - **File(s):** `frontend/src/stores/authStore.ts`, `frontend/src/api/adapter/client.ts`, `frontend/src/lib/virto-sdk.ts`
  - **What:** Auth token (with blockchain signing authority) stored in plain localStorage via Zustand persist. Any XSS vulnerability gives full access to this token. Migrate to httpOnly cookies with CSRF protection.
  - **Why:** For a financial platform handling blockchain transactions, token theft via XSS is the highest-impact attack vector.
  - **Acceptance criteria:**
    - Token stored in httpOnly, Secure, SameSite=Strict cookie
    - Bearer token header removed from adapter client interceptor
    - CSRF token implemented for mutation endpoints
    - Token renewal works through cookie refresh
    - Zustand store only persists user info, not token
    - Logout clears cookie server-side
  - **Story points:** 8

- [ ] **P0-PAY-01: Move paymentId from localStorage to backend storage (5 points)** -- Advance
  - *Why this level:* Requires backend API coordination, data model changes, and understanding of the escrow lifecycle. Financial data integrity concern.
  - *Priority:* **P0 - CRITICAL** (Must fix before production)
  - **File(s):** `frontend/src/hooks/useEscrow.ts`, `frontend/src/hooks/usePaymentStatus.ts:69-75`
  - **What:** The paymentId linking the escrow to the project is stored only in localStorage. If localStorage is cleared, the user cannot check escrow status. The on-chain escrow exists but the UI cannot find it.
  - **Why:** Financial data loss. The escrow contract holds real funds that become unreferenceable if localStorage is cleared.
  - **Acceptance criteria:**
    - paymentId stored in backend database associated with the project
    - localStorage used only as a cache/fallback
    - Recovery mechanism: if localStorage is empty, query backend for paymentId
    - If neither has the paymentId, provide user guidance to contact support
    - Existing paymentIds in localStorage migrated on first use
  - **Story points:** 5

- [ ] **P0-CROSS-15: Establish test coverage for critical paths (21 points)** -- Advance
  - *Why this level:* Requires setting up test infrastructure (Vitest, MSW, React Testing Library), defining test strategy, and writing tests for the most critical business logic. Architectural decision-making required.
  - *Priority:* **P0 - CRITICAL** (Must fix before production)
  - **File(s):** Entire frontend -- new test infrastructure + test files
  - **What:** Near-zero test coverage. Any code change can introduce undetected bugs. Prioritize testing of: (1) flowStates.ts state machine logic, (2) useAuth login/register flows, (3) useScope submit/accept/reject, (4) financial calculations (budgetPlanckToHuman, dusdUnits).
  - **Why:** The competitive audit noted "near-zero test coverage." Without tests, every deployment is a manual verification gamble.
  - **Acceptance criteria:**
    - Vitest configured with React Testing Library and MSW
    - flowStates.ts: 95%+ branch coverage (every state transition tested)
    - dusdUnits.ts: existing tests pass with @ts-nocheck removed
    - useAuth: login success, login failure, register, logout tested
    - useScope: submit, accept, reject mutations tested
    - Financial calculations: edge cases (NaN, overflow, zero, negative) tested
    - Target: 60% overall coverage for critical paths
    - `npm run test` and `npm run test:coverage` scripts working
  - **Story points:** 21

---

# Low -- Becarios/Interns (41 points, 20 features)

> Note: The original TASK_BACKLOG.md summary claims 78 features / 300 points, but the actual
> sum of individually listed features is 85 features / 283 points. The release-level totals
> for Release 2 (claims 61, actual 49) and Release 3 (claims 63, actual 58) are overstated
> in the original document. This reorganized file uses the correct per-feature values.

## From Release 1: Production Readiness

### From Epic 1.4: Critical Test Infrastructure

- [ ] **Feature 1.4.5: Unit tests for dusdUnits.ts (remove @ts-nocheck) (2 points)** -- Low
  - *Why this level:* Mechanical task -- remove a directive, verify existing tests pass, no new logic needed. Clear instructions, no architectural understanding required.
  - **File(s):** `/frontend/src/lib/dusdUnits.test.ts`
  - **What:** Remove the `@ts-nocheck` directive now that vitest types are installed. Verify all existing tests pass. Add any missing edge case tests.
  - **Why:** `@ts-nocheck` disables all type checking in the file. The test file could have type errors that mask real bugs.
  - **Acceptance criteria:**
    - `@ts-nocheck` removed
    - All 16 existing tests pass with full type checking
    - No `any` types in test file
    - All test assertions use specific matchers (`toBe`, `toEqual`)
  - **Story points:** 2

### From Epic 1.7: API Client Reliability

- [ ] **Feature 1.7.1: Reduce API timeout from 160 seconds (1 point)** -- Low
  - *Why this level:* Single constant change with clear target values. No logic changes, no architectural understanding needed.
  - **File(s):** `/frontend/src/api/config.ts:168`
  - **What:** `API_TIMEOUT = 160000` (160 seconds). This is excessively long. A user waiting 2.5 minutes for an API response will have long abandoned the page. Reduce to 30 seconds for most operations, with configurable longer timeout for blockchain write operations.
  - **Why:** Long timeouts keep connections open, consume browser resources, and provide terrible UX.
  - **Acceptance criteria:**
    - Default timeout: 30 seconds
    - Blockchain operations (deploy, sign): 60 seconds
    - Timeout is configurable per-request where needed
    - Constants are named and documented
  - **Story points:** 1

---

## From Release 2: Quality and Stability

### From Epic 2.3: Spanish/English Mixed Messages

- [ ] **Feature 2.3.1: Standardize error messages to English (3 points)** -- Low
  - *Why this level:* String replacement task. Find Spanish strings, replace with English equivalents. No logic changes, no architectural decisions.
  - **File(s):** `/frontend/src/services/clientService.ts:27,82-91`, `/frontend/src/services/developerService.ts:33,114-124`
  - **What:** Client and developer services throw Spanish error messages: `'El campo email es obligatorio para loguear un cliente.'`, `'El campo name es obligatorio para registrar un cliente.'`, etc. The UI is entirely in English. These Spanish strings will appear in error dialogs/toasts.
  - **Why:** Mixed-language error messages confuse users and make support harder.
  - **Acceptance criteria:**
    - All user-facing error messages in English
    - Consistent message format: `"Field {field} is required for {action}"`
    - Error messages extracted to constants file for future i18n
    - All Spanish strings identified and replaced
  - **Story points:** 3

### From Epic 2.4: Configuration Externalization

- [ ] **Feature 2.4.1: Move CALENDAR_ADDRESS to environment variable (2 points)** -- Low
  - *Why this level:* Simple config externalization. Move a hardcoded value to an env var with a fallback. Well-documented pattern in the codebase.
  - **File(s):** `/frontend/src/api/config.ts:9`
  - **What:** `CALENDAR_ADDRESS = 'Dd34LSU53MLwJpq4wfHmDFwAifJrcaPbd1qTCGZcR7iXQkd'` is hardcoded. This should be an environment variable so it can change between environments without code changes.
  - **Why:** Calendar contract address differs between dev/staging/production. Hardcoding means code changes for deployment.
  - **Acceptance criteria:**
    - `VITE_CALENDAR_ADDRESS` environment variable
    - Fallback to current hardcoded value for development
    - `.env.example` updated with new variable
    - All references use the config constant
  - **Story points:** 2

- [ ] **Feature 2.4.2: Add build artifact files to .gitignore (1 point)** -- Low
  - *Why this level:* Pure configuration change. Add two lines to .gitignore and run git rm --cached. No code changes.
  - **File(s):** `/frontend/.gitignore`, `/frontend/tsconfig.tsbuildinfo`, `/frontend/vite.config.d.ts`
  - **What:** `tsconfig.tsbuildinfo` and `vite.config.d.ts` are checked into the repo. These are build artifacts that should be gitignored.
  - **Why:** Build artifacts in git cause merge conflicts and inflate repository size.
  - **Acceptance criteria:**
    - `tsconfig.tsbuildinfo` added to `.gitignore`
    - `vite.config.d.ts` added to `.gitignore`
    - Both files removed from tracking: `git rm --cached`
  - **Story points:** 1

### From Epic 2.7: Move DevTools to devDependencies

- [ ] **Feature 2.7.1: Move @tanstack/react-query-devtools to devDependencies (1 point)** -- Low
  - *Why this level:* Move one line in package.json from dependencies to devDependencies. Add a conditional import check. Minimal risk, clear instructions.
  - **File(s):** `/frontend/package.json:16`
  - **What:** `@tanstack/react-query-devtools` is in `dependencies` instead of `devDependencies`. It should only be included in development builds.
  - **Why:** Adds unnecessary bundle size to production builds.
  - **Acceptance criteria:**
    - Package moved to `devDependencies`
    - Conditional import in `main.tsx` (only in development)
    - Production build does not include devtools code
  - **Story points:** 1

### From Epic 2.8: Pre-commit Quality Gates

- [ ] **Feature 2.8.2: Add Prettier formatting enforcement (2 points)** -- Low
  - *Why this level:* Configuration file creation. Add .prettierrc, add npm scripts, install plugin. No application logic changes.
  - **File(s):** `/frontend/package.json` (prettier already installed but no config)
  - **What:** Prettier is in devDependencies but there is no `.prettierrc` configuration file and no format script. Add configuration aligned with the project's style.
  - **Why:** Inconsistent formatting causes noisy diffs and merge conflicts.
  - **Acceptance criteria:**
    - `.prettierrc` configuration file with project standards
    - `npm run format` script for manual formatting
    - `npm run format:check` script for CI validation
    - Prettier integrated with lint-staged (auto-format on commit)
    - `prettier-plugin-tailwindcss` configured for class sorting
  - **Story points:** 2

---

## From Release 3: UX Excellence

### From Epic 3.3: Skeleton Loading Screens

- [ ] **Feature 3.3.2: Replace spinner with skeleton on DashboardPage (2 points)** -- Low
  - *Why this level:* Swap one component for another following an established pattern from Feature 3.3.1. No new logic, just layout matching.
  - **File(s):** `/frontend/src/pages/dashboard/DashboardPage.tsx:214-228`
  - **What:** Replace the centered spinner loading state with skeleton cards matching the Kanban column layout (3 columns with 2-3 skeleton cards each).
  - **Why:** Dashboard is the first page users see after login. Skeleton screens make it feel faster.
  - **Acceptance criteria:**
    - Kanban layout skeleton (3 columns, 2 cards each)
    - Skeleton matches the card dimensions and spacing
    - Transition from skeleton to real content is smooth
  - **Story points:** 2

- [ ] **Feature 3.3.3: Replace spinner with skeleton on ProjectsPage, ProjectDetailPage (3 points)** -- Low
  - *Why this level:* Same pattern as 3.3.2 -- swap spinners for skeleton components. Mechanical replacement following established pattern.
  - **File(s):** `/frontend/src/pages/projects/ProjectsPage.tsx`, `/frontend/src/pages/projects/ProjectDetailPage.tsx`
  - **What:** Replace spinner loading states with page-specific skeletons: project grid cards on ProjectsPage, project header + tab content on ProjectDetailPage.
  - **Why:** Consistent loading experience across the most-visited pages.
  - **Acceptance criteria:**
    - ProjectsPage: grid of 6 skeleton project cards
    - ProjectDetailPage: skeleton header, skeleton tabs, skeleton milestone list
    - Layout matches final rendered layout (no shift)
  - **Story points:** 3

### From Epic 3.4: WCAG Accessibility

- [ ] **Feature 3.4.1: Fix tertiary text color to pass WCAG AA contrast (2 points)** -- Low
  - *Why this level:* Single CSS value change. Update one color variable to meet a documented contrast ratio. No logic, no judgment calls.
  - **File(s):** `/frontend/src/index.css:54`
  - **What:** `--text-dark-tertiary: rgba(255,255,255,0.36)` = contrast ratio ~2.4:1 against `#141414` background. WCAG AA requires 4.5:1 for normal text. Increase to minimum `rgba(255,255,255,0.58)` for 4.5:1 ratio.
  - **Why:** WCAG AA compliance is a legal requirement in many jurisdictions and essential for users with low vision.
  - **Acceptance criteria:**
    - `--text-dark-tertiary` updated to pass AA contrast ratio (4.5:1 min)
    - All elements using this variable verified for visual correctness
    - Contrast checked with automated tool (axe-core or similar)
    - Design approval for new value
  - **Story points:** 2

- [ ] **Feature 3.4.2: Add skip-to-content link (WCAG 2.4.1) (1 point)** -- Low
  - *Why this level:* Well-documented accessibility pattern. Add a hidden anchor link and a CSS class. Clear acceptance criteria, no architectural knowledge needed.
  - **File(s):** `/frontend/src/components/layouts/AppLayout.tsx`, `/frontend/src/index.css`
  - **What:** No skip-to-content link exists. Keyboard users must tab through the entire sidebar on every page. Add a visually hidden link that becomes visible on focus, jumping to `#main-content`.
  - **Why:** WCAG 2.4.1 Bypass Blocks is a Level A requirement. Keyboard-only users cannot efficiently navigate.
  - **Acceptance criteria:**
    - "Skip to main content" link is the first focusable element
    - Visible only on keyboard focus (not visible on page load)
    - Target `#main-content` on the main content area
    - Works in all layouts (AuthLayout, AppLayout)
  - **Story points:** 1

- [ ] **Feature 3.4.6: Create 404 Not Found page (2 points)** -- Low
  - *Why this level:* Simple page component with static content. No API calls, no state management, no complex logic.
  - **File(s):** New `/frontend/src/pages/NotFoundPage.tsx`, `/frontend/src/App.tsx:102`
  - **What:** The catch-all route redirects to `/register`. Users who enter a wrong URL get silently redirected with no indication that their URL was invalid. Create a proper 404 page with a link back to dashboard.
  - **Why:** Silent redirects on invalid URLs confuse users and make debugging shared links impossible.
  - **Acceptance criteria:**
    - 404 page with "Page not found" message
    - Link to dashboard and link to login
    - Matches app visual design
    - Catch-all route renders NotFoundPage instead of redirecting
    - Page title set to "Not Found - Abako"
  - **Story points:** 2

### From Epic 3.6: Breadcrumb Navigation

- [ ] **Feature 3.6.2: Add breadcrumbs to deep pages (3 points)** -- Low
  - *Why this level:* Wire an existing shared component into multiple pages. Repetitive task with clear examples to follow.
  - **File(s):** `/frontend/src/pages/projects/ScopeReviewPage.tsx`, `/frontend/src/pages/milestones/MilestoneReviewPage.tsx`, `/frontend/src/pages/projects/TeamEvaluationPage.tsx`, `/frontend/src/pages/projects/DeveloperEvaluationPage.tsx`, `/frontend/src/pages/projects/ConsultantEvaluationPage.tsx`
  - **What:** Add breadcrumb navigation to all deep pages that currently have no way to navigate up: ScopeReviewPage, MilestoneReviewPage, all evaluation pages. Also standardize existing breadcrumbs in ProjectDetailPage, PaymentDetailPage, PaymentFundPage to use the shared component.
  - **Why:** Users reaching these pages from deep links or bookmarks have no navigation context.
  - **Acceptance criteria:**
    - ScopeReviewPage: Dashboard > Projects > [Project Name] > Review Scope
    - MilestoneReviewPage: Dashboard > Projects > [Project Name] > Milestones > Review [Milestone]
    - Evaluation pages: Dashboard > Projects > [Project Name] > Evaluate
    - Existing inline breadcrumbs replaced with shared component
  - **Story points:** 3

### From Epic 3.7: Badge Component Enhancement

- [ ] **Feature 3.7.1: Extend Badge component with additional variants (2 points)** -- Low
  - *Why this level:* Add CSS variants to an existing component. Pattern is already established with success and neutral variants. Copy and adapt.
  - **File(s):** `/frontend/src/components/ui/Badge.tsx`
  - **What:** Badge has only 2 variants: `success` and `neutral`. The app needs: `warning` (amber), `danger` (red), `info` (blue), `brand` (green). Multiple components create ad-hoc badges with inline styles.
  - **Why:** Inconsistent badge styling across the app. Ad-hoc badges cannot be globally updated.
  - **Acceptance criteria:**
    - 6 variants: success, neutral, warning, danger, info, brand
    - Optional `size` prop: sm, md (current)
    - Optional `icon` prop for left icon
    - All ad-hoc badge instances migrated to use the component
    - Visual parity with existing Figma designs
  - **Story points:** 2

### From Epic 3.8: Remove Inline fontFamily Styles

- [ ] **Feature 3.8.1: Remove repeated `style={{ fontFamily: 'Inter' }}` across pages (5 points)** -- Low
  - *Why this level:* Purely mechanical find-and-remove across 41 instances. No logic changes, no judgment needed. The font is already set in CSS.
  - **File(s):** `/frontend/src/pages/projects/ProjectDetailPage.tsx` (23 instances), `/frontend/src/pages/projects/ProjectsPage.tsx` (7 instances), `/frontend/src/pages/dashboard/DashboardPage.tsx` (2 instances), `/frontend/src/pages/projects/ScopeReviewPage.tsx` (4 instances), `/frontend/src/pages/payments/PaymentFundPage.tsx` (2 instances), `/frontend/src/components/features/payments/EscrowPaymentModal.tsx` (2 instances), `/frontend/src/components/layouts/AuthLayout.tsx` (1 instance)
  - **What:** 41+ instances of `style={{ fontFamily: 'Inter' }}` scattered across components. The font is already set in `body` CSS (`font-family: 'Inter', system-ui, ...`) and via `--font-family` CSS variable. These inline styles are redundant.
  - **Why:** Redundant code that adds runtime overhead (React creates style objects on every render). Makes font changes require editing 41+ files instead of 1.
  - **Acceptance criteria:**
    - All `style={{ fontFamily: 'Inter' }}` removed
    - Tailwind `font-inter` utility class available if needed (via tailwind config)
    - Visual verification that font rendering is unchanged
    - No inline style objects remain for fontFamily
  - **Story points:** 5

---

## From Release 4: Performance and Scale

### From Epic 4.7: Resource Optimization

- [ ] **Feature 4.7.1: Preload critical resources and fonts (2 points)** -- Low
  - *Why this level:* HTML link tags and CSS property additions. Well-documented web performance pattern with no application logic changes.
  - **File(s):** `/frontend/index.html`, `/frontend/src/index.css:1`
  - **What:** Inter font loaded via Google Fonts CSS @import (render-blocking). Add `<link rel="preload">` for the font files and use `font-display: swap` to prevent FOIT.
  - **Why:** Fonts are render-blocking. Users see a flash of invisible text (FOIT) on first load.
  - **Acceptance criteria:**
    - Font preload links in `index.html` `<head>`
    - `font-display: swap` in font import
    - Or: self-host Inter font files (eliminates Google Fonts dependency)
    - Lighthouse performance score improvement measured
  - **Story points:** 2

- [ ] **Feature 4.7.2: Add image optimization for avatars (2 points)** -- Low
  - *Why this level:* Add HTML attributes to an existing component. Well-scoped, no architectural understanding needed. Clear acceptance criteria.
  - **File(s):** `/frontend/src/components/ui/Avatar.tsx`
  - **What:** GitHub avatars loaded at `?size=56` but no lazy loading or error fallback. Add `loading="lazy"`, `decoding="async"`, error fallback to initials, and srcset for retina displays.
  - **Why:** Avatar images are on every card and list item. Lazy loading prevents downloading off-screen avatars.
  - **Acceptance criteria:**
    - `loading="lazy"` on all avatar images
    - `decoding="async"` for non-blocking decode
    - Error fallback shows initials in colored circle
    - `srcset` with 1x and 2x sizes for retina
    - Avatar component handles null/undefined src gracefully
  - **Story points:** 2

- [ ] **Feature 4.7.3: Conditional ReactQueryDevtools import (3 points)** -- Low
  - *Why this level:* Conditional dynamic import based on environment flag. Simple pattern, clear instructions, low risk.
  - **File(s):** `/frontend/src/main.tsx:4,29`
  - **What:** ReactQueryDevtools is imported and rendered unconditionally. In production, the component renders nothing but the import still adds to bundle. Use dynamic import conditioned on `import.meta.env.DEV`.
  - **Why:** Eliminates devtools code from production bundle entirely.
  - **Acceptance criteria:**
    - Devtools only imported in development builds
    - `React.lazy` + dynamic `import()` used
    - Production build verified to not include devtools chunk
    - Development experience unchanged
  - **Story points:** 3

---

## From Release 5: Polish and DX

### From Epic 5.5: ComponentsDemo Route

- [ ] **Feature 5.5.1: Link ComponentsDemo page in routing or remove it (1 point)** -- Low
  - *Why this level:* Either add one route line or delete one file. Minimal scope, no judgment needed beyond a binary decision.
  - **File(s):** `/frontend/src/pages/ComponentsDemo.tsx`, `/frontend/src/App.tsx`
  - **What:** `ComponentsDemo.tsx` exists but has no route in `App.tsx`. Either add a `/components` route (dev-only) or remove the dead page.
  - **Why:** Dead code. If useful for development, it should be accessible. If not, it should be removed.
  - **Acceptance criteria:**
    - Either: route added at `/dev/components` (only in development builds)
    - Or: file removed if Storybook (5.1.1) replaces its function
    - No dead code in the codebase
  - **Story points:** 1

### From Epic 5.8: Documentation

- [ ] **Feature 5.8.1: Document environment variables (1 point)** -- Low
  - *Why this level:* Pure documentation task. Find all VITE_ usages and add entries to .env.example. No code changes.
  - **File(s):** `/frontend/.env.example`
  - **What:** `.env.example` exists but only documents `VITE_API_BASE_URL` and `VITE_KREIVO_RPC_URL`. Add `VITE_CALENDAR_ADDRESS` (from Feature 2.4.1) and any other configuration that should be documented.
  - **Why:** New developers need to know what environment variables to configure.
  - **Acceptance criteria:**
    - All `import.meta.env.VITE_*` usages have corresponding entries in `.env.example`
    - Each variable has a comment explaining its purpose
    - Default values provided where appropriate
  - **Story points:** 1

---

# Medium -- Junior Developers (109 points, 35 features)

## From Release 1: Production Readiness

### From Epic 1.1: Financial Flow Integrity

- [ ] **Feature 1.1.2: Replace hardcoded `advancePaymentPercentage: 100` in useScope (2 points)** -- Medium
  - *Why this level:* Requires understanding the hook and config pattern, adding validation logic. Defined scope but needs judgment on where the value should come from.
  - **File(s):** `/frontend/src/hooks/useScope.ts:78`
  - **What:** The value `100` is hardcoded as the advance payment percentage when submitting scope. This should come from project configuration or user input. The comment says "deposit 100% to escrow" which may be intentional, but the value should still be configurable and not a magic number.
  - **Why:** Hardcoding 100% means the client must fund the entire project upfront with no ability to negotiate staged payments. If business rules change, a code deployment is required.
  - **Acceptance criteria:**
    - `advancePaymentPercentage` comes from project settings, environment config, or explicit user selection
    - Value is validated (0-100 range, integer)
    - Default behavior is documented
    - Unit test covers validation
  - **Story points:** 2

- [ ] **Feature 1.1.3: Replace hardcoded `advancePaymentPercentage: 25` in usePayments (2 points)** -- Medium
  - *Why this level:* Requires tracing data flow between useScope and usePayments to ensure consistency. Needs understanding of how the value propagates but well-defined fix.
  - **File(s):** `/frontend/src/hooks/usePayments.ts:67`, `/frontend/src/hooks/usePayments.ts:103`
  - **What:** Both `usePayments()` and `usePayment()` hooks return a hardcoded `advancePaymentPercentage: 25`. This conflicts with the `100` in `useScope.ts` -- two different hardcoded values for the same concept.
  - **Why:** Inconsistent advance payment percentages (100% in scope submission, 25% in payment display) will cause incorrect payment calculations shown to users. Financial display errors erode trust.
  - **Acceptance criteria:**
    - Single source of truth for advance payment percentage per project
    - Value retrieved from project data or configuration API
    - `useScope.ts` and `usePayments.ts` use the same value
    - Payment summaries display correct percentages
  - **Story points:** 2

- [ ] **Feature 1.1.4: Remove hardcoded profile defaults in useProfile update payloads (3 points)** -- Medium
  - *Why this level:* Requires understanding the payload builder functions and deciding on proper empty-value handling. Touches data integrity but is well-scoped within two functions.
  - **File(s):** `/frontend/src/hooks/useProfile.ts:173-186`, `/frontend/src/hooks/useProfile.ts:273-282`
  - **What:** `buildClientUpdatePayload()` uses string literals as defaults: `'name'`, `'company'`, `'department'`, `'website'`, `'description'`, `'location'`. Same pattern in `buildDeveloperUpdatePayload()` with `'name'`, `'githubUsername'`, `'portfolioUrl'`, `'bio'`, `'background'`, `'location'`. If a user clears a field, the API receives the literal string `"company"` instead of an empty value.
  - **Why:** Users see placeholder text saved as their actual profile data. A client whose company field is empty gets `"company"` displayed. This is a data integrity bug.
  - **Acceptance criteria:**
    - Empty fields send `''` (empty string) or `null`, not placeholder strings
    - Existing profiles with placeholder data are identified (query check)
    - Validation prevents saving obviously invalid defaults
    - Tests cover empty field submission
  - **Story points:** 3

### From Epic 1.2: Security Hardening

- [ ] **Feature 1.2.2: Validate URL scheme before rendering as href (2 points)** -- Medium
  - *Why this level:* Requires understanding XSS vectors and creating a reusable utility. The solution is well-documented but needs care in covering all dangerous schemes.
  - **File(s):** `/frontend/src/pages/projects/ProjectDetailPage.tsx:397`
  - **What:** `project.url` from the API is rendered directly in an `<a href={project.url}>` tag without scheme validation. If the API returns `javascript:alert(1)` or a `data:` URI, this becomes an XSS vector.
  - **Why:** Stored XSS via project URLs. An attacker creates a project with a malicious URL; every user who views the project detail page is compromised.
  - **Acceptance criteria:**
    - URL validated to have `http://` or `https://` scheme before rendering as clickable link
    - Invalid URLs displayed as plain text, not clickable
    - Utility function created for URL sanitization (reusable)
    - Unit test covers `javascript:`, `data:`, `vbscript:`, relative URLs, valid HTTP(S) URLs
  - **Story points:** 2

- [ ] **Feature 1.2.3: Sanitize console.error from logging sensitive data in production (3 points)** -- Medium
  - *Why this level:* Requires creating a logging wrapper and migrating 30+ call sites. Pattern is clear but scope is wide. No architectural decisions needed.
  - **File(s):** `/frontend/src/api/adapter/client.ts:156-161`, `/frontend/src/api/virto/client.ts:60-65`, `/frontend/src/api/contracts/index.ts:125-130`, plus 24 additional `console.error` calls across services
  - **What:** The error handler logs `error.response?.data` which may contain tokens, user emails, or other PII. In production, this data ends up in browser developer console where shoulder-surfing or browser extensions can capture it. Additionally, the 30+ `console.error` calls across services log full error objects.
  - **Why:** Sensitive data leakage via browser console. Production logging should use a structured logging service, not console.
  - **Acceptance criteria:**
    - Production builds use a logging wrapper that redacts sensitive fields (token, email, data)
    - Development builds retain full logging for debugging
    - Logger checks `import.meta.env.PROD` to determine behavior
    - All 30+ `console.error` calls migrated to use the new logger
    - No raw `error.response?.data` logged in production
  - **Story points:** 3

### From Epic 1.4: Critical Test Infrastructure

- [ ] **Feature 1.4.1: Install and configure test runner (Vitest) (5 points)** -- Medium
  - *Why this level:* Requires understanding Vite/Vitest ecosystem, configuring path aliases, setting up testing library. Well-documented process but needs careful configuration alignment.
  - **File(s):** `/frontend/package.json`, new `vitest.config.ts`, new `src/test/setup.ts`
  - **What:** No test runner is installed. The single test file (`dusdUnits.test.ts`) has `@ts-nocheck` because vitest/jest types are not available. Install Vitest (aligned with Vite), `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `msw` for API mocking. Configure path aliases to match `tsconfig.json`.
  - **Why:** Zero test infrastructure means zero automated validation. Every deployment is manual verification.
  - **Acceptance criteria:**
    - `npm run test` executes Vitest successfully
    - `npm run test:coverage` generates coverage report
    - Path aliases (`@/`, `@hooks/`, `@components/`, `@lib/`, `@stores/`) resolve correctly
    - `dusdUnits.test.ts` runs without `@ts-nocheck`
    - React Testing Library configured with custom render wrapper (QueryClientProvider, BrowserRouter)
    - MSW handlers scaffold for adapter, virto, contracts APIs
    - CI-compatible JSON reporter configured
  - **Story points:** 5

- [ ] **Feature 1.4.2: Unit tests for flowStates.ts (5 points)** -- Medium
  - *Why this level:* Requires understanding the state machine but the testing task itself is well-defined. State transitions are documented, and acceptance criteria are explicit.
  - **File(s):** `/frontend/src/lib/flowStates.ts`, new `/frontend/src/lib/flowStates.test.ts`
  - **What:** The state machine is the core business logic governing project and milestone lifecycle. Test every state transition, every edge case (missing fields, unknown states, null values), and the `flowProjectState()` function that maps raw project data to display states.
  - **Why:** State machine bugs in `main` caused payment failures (unreachable Paid state). The TypeScript port must be verified against all known edge cases to prevent regressions.
  - **Acceptance criteria:**
    - Every `ProjectState` value has at least one test case
    - Every `MilestoneState` value has at least one test case
    - `flowProjectState()` tested with all combinations of `creationStatus`, `projectState`, scope conditions
    - Edge cases: undefined project, null milestones, empty state string, unknown state values
    - Exhaustiveness check: any new state added without a test case causes test failure
    - Minimum 95% branch coverage for flowStates.ts
  - **Story points:** 5

- [ ] **Feature 1.4.3: Unit tests for all service layers (8 points)** -- Medium
  - *Why this level:* Large scope but follows standard testing patterns. Requires MSW mocking knowledge. Each service function is independently testable with clear inputs/outputs.
  - **File(s):** `/frontend/src/services/projectService.ts`, `/frontend/src/services/clientService.ts`, `/frontend/src/services/developerService.ts`, `/frontend/src/services/calendarService.ts`, `/frontend/src/services/milestoneService.ts`, `/frontend/src/services/proposalService.ts`, `/frontend/src/services/ratingService.ts`
  - **What:** Test all service functions with MSW mocking API responses. Focus on: `cleanProject()` mutation behavior, `getProjectsIndex()` deduplication logic, `getProjectDevelopers()` sequential N+1, error handling paths, and `as unknown as` type cast correctness.
  - **Why:** Services are the data composition layer. Bugs here propagate to every page that consumes the data.
  - **Acceptance criteria:**
    - Every exported function has at least happy-path and error-case tests
    - `cleanProject()` tested for mutation side effects
    - `getProjectsIndex()` tested for deduplication and parallel fetch
    - `getProjectDevelopers()` tested for N+1 sequential behavior
    - Contract task filtering logic tested (the pattern repeated 3 times)
    - MSW handlers provide realistic API response shapes
    - Minimum 80% coverage for services/
  - **Story points:** 8

- [ ] **Feature 1.4.7: Unit tests for permissions.ts (3 points)** -- Medium
  - *Why this level:* Well-scoped test writing task. Permission functions have clear inputs (user role, project) and outputs (boolean). Requires understanding role model but no architectural decisions.
  - **File(s):** `/frontend/src/lib/permissions.ts`, new `/frontend/src/lib/permissions.test.ts`
  - **What:** Test all permission checking functions that gate UI actions (scope approval, milestone review, payment release, etc.).
  - **Why:** Permission bugs allow unauthorized actions. In a financial app, a developer approving their own milestone payout is a critical vulnerability.
  - **Acceptance criteria:**
    - Every permission function tested with all role combinations (client, developer/consultant, coordinator)
    - Edge cases: user with both clientId and developerId, missing user, null project
    - Permission denials tested (not just grants)
  - **Story points:** 3

### From Epic 1.5: Type Safety for Financial Paths

- [ ] **Feature 1.5.4: Strengthen `cleanProject()` to not mutate arguments (2 points)** -- Medium
  - *Why this level:* Refactor existing functions to return new objects instead of mutating. Requires understanding object destructuring and immutability patterns but is well-scoped.
  - **File(s):** `/frontend/src/services/projectService.ts:41-47,53-58`
  - **What:** `cleanProject()` and `cleanMilestone()` mutate their arguments via `delete`. This is a side-effect pattern that makes data flow harder to reason about. Refactor to pure functions that return new objects with unwanted fields omitted.
  - **Why:** Mutation of shared objects can cause subtle bugs when the same object reference is used elsewhere (e.g., React Query cache).
  - **Acceptance criteria:**
    - `cleanProject` returns a new object, does not modify input
    - `cleanMilestone` returns a new object, does not modify input
    - Functions have explicit return types
    - No `delete` operator used on arguments
    - Callers updated to use return values
  - **Story points:** 2

### From Epic 1.6: Navigation and Auth Guards

- [ ] **Feature 1.6.1: Fix ProtectedRoute redirect inconsistency (2 points)** -- Medium
  - *Why this level:* Requires understanding the auth flow and React Router redirects. Small change but needs to be consistent across multiple files.
  - **File(s):** `/frontend/src/components/shared/ProtectedRoute.tsx:17`, `/frontend/src/App.tsx:102`
  - **What:** `ProtectedRoute` redirects unauthenticated users to `/register` but the JSDoc comment says "redirects to /login". The catch-all route in `App.tsx:102` also redirects to `/register`. Users who have accounts but logged out should go to `/login`, not `/register`.
  - **Why:** Existing users who get logged out (token expiry, 401) are sent to registration instead of login, creating confusion and potential duplicate accounts.
  - **Acceptance criteria:**
    - `ProtectedRoute` redirects to `/login` for unauthenticated users
    - Catch-all route redirects to `/login`
    - New users explicitly navigated to `/register` from the login page
    - 401 interceptor redirect in `api/adapter/client.ts:137` matches
    - JSDoc comment matches implementation
  - **Story points:** 2

### From Epic 1.7: API Client Reliability

- [ ] **Feature 1.7.3: Add request cancellation on component unmount for adapter/virto clients (2 points)** -- Medium
  - *Why this level:* Requires understanding AbortController and React Query signal forwarding. Pattern exists in the Kreivo client for reference.
  - **File(s):** `/frontend/src/api/adapter/client.ts`, `/frontend/src/api/virto/client.ts`
  - **What:** The adapter and virto axios clients have no AbortController integration. When a user navigates away from a page, in-flight requests continue and may trigger state updates on unmounted components. (Note: Kreivo RPC client already implements AbortController correctly.)
  - **Why:** Memory leaks and "Can't perform a React state update on an unmounted component" warnings. In-flight requests waste bandwidth.
  - **Acceptance criteria:**
    - React Query's built-in signal forwarded to axios requests
    - Axios `signal` option used on requests
    - Component unmount cancels pending requests
    - No "state update on unmounted component" warnings
  - **Story points:** 2

---

## From Release 2: Quality and Stability

### From Epic 2.1: Runtime Validation with Zod

- [ ] **Feature 2.1.3: Add Zod schemas for contracts API responses (2 points)** -- Medium
  - *Why this level:* Follows the same pattern established in 2.1.1. Smaller scope (fewer endpoints). Requires Zod knowledge but the pattern is documented.
  - **File(s):** `/frontend/src/api/contracts/index.ts`, new schemas
  - **What:** Validate contract deployment, query, and call responses against Zod schemas.
  - **Why:** Contract responses drive financial operations (escrow, payment release). Invalid response data could cause incorrect blockchain transactions.
  - **Acceptance criteria:**
    - Zod schemas for: HealthCheck, Constructors, Query, Call, Deploy responses
    - All contract API functions validate responses
  - **Story points:** 2

- [ ] **Feature 2.1.4: Add Zod validation for form inputs (3 points)** -- Medium
  - *Why this level:* Requires react-hook-form and Zod resolver knowledge. Well-documented integration pattern. Each form is independently validatable.
  - **File(s):** `/frontend/src/pages/projects/CreateProjectPage.tsx`, `/frontend/src/pages/profiles/ClientProfilePage.tsx`, `/frontend/src/pages/profiles/DeveloperProfilePage.tsx`, `/frontend/src/components/features/projects/ScopeBuilder.tsx`
  - **What:** react-hook-form and @hookform/resolvers are installed but Zod resolvers are not used. Add Zod schemas for all form inputs: project creation, profile updates, scope builder, milestone submission.
  - **Why:** Client-side validation prevents invalid data from reaching the API. Form validation also provides immediate user feedback.
  - **Acceptance criteria:**
    - Zod schemas for: CreateProject, UpdateClient, UpdateDeveloper, SubmitScope, SubmitMilestone forms
    - @hookform/resolvers/zod used in all form components
    - Inline validation errors displayed to users
    - Email format, URL format, budget range validated
  - **Story points:** 3

### From Epic 2.6: Contract Task Filtering DRY

- [ ] **Feature 2.6.1: Extract repeated contract task filtering into utility function (3 points)** -- Medium
  - *Why this level:* Classic DRY refactor. Identify repeated pattern, extract to utility, replace call sites. Requires understanding the data flow but the pattern is identical in all 3 locations.
  - **File(s):** `/frontend/src/services/projectService.ts:88-95,270-275,411-416`
  - **What:** The pattern of extracting contract task IDs, creating a Set, and filtering milestones is repeated 3 times with identical logic. Extract to a single utility function: `filterMilestonesToContractScope(allMilestones, contractTasks)`.
  - **Why:** DRY violation. Three copies means three places to introduce bugs if the filtering logic needs to change.
  - **Acceptance criteria:**
    - Single `filterMilestonesToContractScope()` function
    - All 3 call sites refactored to use it
    - Function handles edge cases: empty contract tasks, empty milestones, mismatched IDs
    - Unit test covers the extracted function
  - **Story points:** 3

### From Epic 2.8: Pre-commit Quality Gates

- [ ] **Feature 2.8.1: Install and configure husky + lint-staged (3 points)** -- Medium
  - *Why this level:* Tooling setup that requires understanding git hooks and build tooling. Well-documented process but needs correct integration with the project's linting and type checking.
  - **File(s):** `/frontend/package.json`, new `.husky/pre-commit`, new `.lintstagedrc`
  - **What:** No pre-commit hooks installed. Changes can be committed without passing typecheck or lint. Install husky for git hooks, lint-staged for running checks only on staged files.
  - **Why:** Without pre-commit hooks, broken code can be committed and pushed, blocking other developers.
  - **Acceptance criteria:**
    - `husky` and `lint-staged` installed and configured
    - Pre-commit hook runs: `tsc --noEmit` on staged .ts/.tsx files, `eslint --fix` on staged files, `prettier --write` on staged files
    - Hook is fast (lint-staged only processes changed files)
    - Can be bypassed with `--no-verify` for emergencies
  - **Story points:** 3

---

## From Release 3: UX Excellence

### From Epic 3.2: Confirmation Dialogs

- [ ] **Feature 3.2.1: Add confirmation dialog primitive component (3 points)** -- Medium
  - *Why this level:* Requires creating a reusable component with focus trap, portal rendering, and keyboard support. Well-defined UI pattern but needs accessibility knowledge.
  - **File(s):** New `/frontend/src/components/ui/ConfirmDialog.tsx`
  - **What:** No confirmation dialogs exist for destructive actions. Create a reusable dialog component with: title, description, confirm button (customizable label/variant), cancel button, focus trap, Escape key support, overlay click dismiss.
  - **Why:** Users can reject a scope, reject a milestone, or release payment with a single click and no confirmation. Accidental clicks on destructive actions cannot be undone.
  - **Acceptance criteria:**
    - Reusable `ConfirmDialog` component
    - Focus trap (like EscrowPaymentModal)
    - aria-modal, role="alertdialog" for destructive actions
    - Configurable: title, message, confirmLabel, confirmVariant (danger/primary)
    - Renders via portal (document.body)
    - Keyboard support: Escape = cancel, Enter = confirm
    - `useConfirm()` hook for imperative usage
  - **Story points:** 3

- [ ] **Feature 3.2.2: Add confirmation to destructive actions (2 points)** -- Medium
  - *Why this level:* Wire existing ConfirmDialog into action components. Requires understanding which actions are destructive and what context to show, but the pattern is defined.
  - **File(s):** `/frontend/src/components/features/projects/ProjectActions.tsx`, `/frontend/src/components/features/milestones/MilestoneActions.tsx`, `/frontend/src/pages/projects/ScopeReviewPage.tsx`
  - **What:** Wire confirmation dialogs to: reject scope, reject milestone, reject proposal, release payment. Each should show context-specific messaging.
  - **Why:** Irreversible blockchain operations need explicit user confirmation.
  - **Acceptance criteria:**
    - "Reject Scope" shows confirm dialog with project name
    - "Reject Milestone" shows confirm dialog with milestone name
    - "Reject Proposal" shows confirm dialog
    - "Release Payment" shows confirm dialog with amount
    - All confirm dialogs require explicit click (not just Enter key)
  - **Story points:** 2

### From Epic 3.3: Skeleton Loading Screens

- [ ] **Feature 3.3.1: Create skeleton component primitives (3 points)** -- Medium
  - *Why this level:* Requires creating flexible, composable UI primitives with animations and dark theme support. Needs design sense and component API design skills.
  - **File(s):** New `/frontend/src/components/ui/Skeleton.tsx`
  - **What:** All loading states use `<Spinner>` centered on page. Create skeleton primitives: `SkeletonText`, `SkeletonBlock`, `SkeletonCircle`, `SkeletonCard` with pulse animation matching the dark theme.
  - **Why:** Skeleton screens reduce perceived loading time and prevent layout shift when data arrives.
  - **Acceptance criteria:**
    - Base `Skeleton` component with customizable dimensions
    - `SkeletonText` (lines with varying widths)
    - `SkeletonCard` (card shape with internal skeleton lines)
    - `SkeletonAvatar` (circle/square)
    - Dark theme pulse animation (surface-1 to surface-2)
    - Respects `prefers-reduced-motion`
  - **Story points:** 3

### From Epic 3.4: WCAG Accessibility

- [ ] **Feature 3.4.3: Add WAI-ARIA tab pattern to TabsLine component (3 points)** -- Medium
  - *Why this level:* Requires understanding WAI-ARIA tab pattern and keyboard navigation. Well-documented pattern but needs careful implementation of roles, states, and keyboard handlers.
  - **File(s):** `/frontend/src/components/ui/TabsLine.tsx`, `/frontend/src/pages/projects/ProjectDetailPage.tsx:204-232` (local TabsLine)
  - **What:** TabsLine uses plain `<button>` elements without `role="tablist"`, `role="tab"`, `aria-selected`, `tabindex`, or arrow key navigation. Two implementations exist: the shared `TabsLine` component and a local copy in `ProjectDetailPage.tsx`.
  - **Why:** Screen readers cannot identify this as a tab interface. Keyboard users cannot navigate tabs with arrow keys (WAI-ARIA Tabs Pattern).
  - **Acceptance criteria:**
    - Container has `role="tablist"`
    - Each tab button has `role="tab"`, `aria-selected`, `aria-controls`
    - Tab panels have `role="tabpanel"`, `aria-labelledby`
    - Arrow key navigation between tabs (Left/Right)
    - Home/End keys jump to first/last tab
    - Active tab has `tabindex="0"`, inactive tabs have `tabindex="-1"`
    - Local TabsLine in ProjectDetailPage replaced with shared component
  - **Story points:** 3

- [ ] **Feature 3.4.5: Add `aria-label` and keyboard support to Dialog/Modal primitive (2 points)** -- Medium
  - *Why this level:* Component extraction and accessibility enhancement. Requires understanding focus traps and ARIA dialog patterns, but the existing implementation serves as reference.
  - **File(s):** `/frontend/src/components/features/payments/EscrowPaymentModal.tsx`
  - **What:** EscrowPaymentModal implements its own focus trap. Extract into a reusable `Dialog` primitive that handles: portal rendering, focus trap, scroll lock, aria attributes, Escape dismiss. Use this as the base for ConfirmDialog (3.2.1) and future modals.
  - **Why:** Each modal reimplementing focus trap is error-prone and inconsistent. A shared primitive ensures accessibility compliance.
  - **Acceptance criteria:**
    - Reusable `Dialog` component with focus trap, scroll lock, portal rendering
    - `aria-modal="true"`, `role="dialog"` (or `role="alertdialog"`)
    - `aria-labelledby` and `aria-describedby` props
    - EscrowPaymentModal refactored to use `Dialog`
    - ConfirmDialog uses `Dialog`
  - **Story points:** 2

### From Epic 3.5: AvailabilityPopover Mobile Responsive

- [ ] **Feature 3.5.1: Fix AvailabilityPopover overflow on mobile (3 points)** -- Medium
  - *Why this level:* Responsive design task requiring CSS breakpoints and layout decisions. Needs understanding of positioning strategies but well-scoped to one component.
  - **File(s):** `/frontend/src/components/features/availability/AvailabilityPopover.tsx:144`
  - **What:** Hardcoded `w-[516px]` overflows on viewports narrower than 516px. No responsive breakpoints. The popover uses absolute positioning relative to sidebar which doesn't exist on mobile.
  - **Why:** Mobile users cannot interact with the availability popover -- it overflows off-screen and may be unreachable.
  - **Acceptance criteria:**
    - Mobile: full-width bottom sheet or centered modal
    - Tablet: positioned popover with `max-w-[516px]`
    - Desktop: current sidebar-adjacent behavior
    - Popover does not overflow viewport at any width
    - Touch-friendly tap targets (minimum 44x44px)
  - **Story points:** 3

### From Epic 3.6: Breadcrumb Navigation

- [ ] **Feature 3.6.1: Add breadcrumb component (2 points)** -- Medium
  - *Why this level:* Requires designing a shared component API with accessibility (nav element, aria-label). Moderate judgment needed on responsive truncation behavior.
  - **File(s):** New `/frontend/src/components/shared/Breadcrumb.tsx`
  - **What:** Currently breadcrumbs are inline JSX in ProjectDetailPage, PaymentDetailPage, PaymentFundPage with inconsistent styling. Create a shared `Breadcrumb` component.
  - **Why:** Consistent navigation pattern. Deep pages (scope review, milestone review) have no way back except browser back button.
  - **Acceptance criteria:**
    - Reusable `Breadcrumb` component accepting array of `{ label, href? }`
    - Last item is current page (not a link)
    - Separator character: `/`
    - `aria-label="Breadcrumb"` and `nav` element
    - Responsive: truncates middle items on narrow screens
  - **Story points:** 2

### From Epic 3.9: Duplicate TabsLine Elimination

- [ ] **Feature 3.9.1: Replace local TabsLine in ProjectDetailPage with shared component (2 points)** -- Medium
  - *Why this level:* Requires understanding both TabsLine implementations and merging styles. Needs judgment on which styles to keep. Component refactoring with potential regressions.
  - **File(s):** `/frontend/src/pages/projects/ProjectDetailPage.tsx:204-232`, `/frontend/src/components/ui/TabsLine.tsx`
  - **What:** ProjectDetailPage defines its own local `TabsLine` component (lines 204-232) with hardcoded tabs, separate from the shared `TabsLine` component in `components/ui/TabsLine.tsx`. The local version uses different styling.
  - **Why:** DRY violation. Two tab implementations means inconsistent behavior and double the maintenance.
  - **Acceptance criteria:**
    - Local TabsLine removed from ProjectDetailPage
    - Shared TabsLine used with appropriate tabs passed as props
    - Visual parity maintained (may require adding style props to shared component)
    - WAI-ARIA tab pattern applied (from Feature 3.4.3)
  - **Story points:** 2

### From Epic 3.10: Fix key={index} Anti-pattern

- [ ] **Feature 3.10.1: Replace key={index} with stable keys on dynamic lists (5 points)** -- Medium
  - *Why this level:* Requires identifying which lists are dynamic vs static and generating appropriate stable keys. Needs React knowledge and judgment on key generation strategy per list.
  - **File(s):** `/frontend/src/pages/projects/CreateProjectPage.tsx:510,557,806,820`, `/frontend/src/pages/projects/ConsultantEvaluationPage.tsx:234`, `/frontend/src/pages/projects/DeveloperEvaluationPage.tsx:200`, `/frontend/src/pages/projects/TeamEvaluationPage.tsx:236`, `/frontend/src/pages/projects/ProjectDetailPage.tsx:429,443`, `/frontend/src/pages/projects/ProjectsPage.tsx:342`, `/frontend/src/components/features/projects/ScopeBuilder.tsx:264`, `/frontend/src/components/features/dao/BlockGrid.tsx:92`, `/frontend/src/components/ui/ProgressSegmented.tsx:19`, `/frontend/src/components/ui/CardWidget.tsx:28`, `/frontend/src/components/ui/StepperNumeric.tsx:20`
  - **What:** 15+ instances of `key={index}` or `key={i}` on lists that can be reordered, added to, or removed from. This causes React to incorrectly reuse DOM nodes when items shift positions.
  - **Why:** `key={index}` on dynamic lists causes state corruption: form inputs retain values from different items, animations glitch, and performance degrades on reorder.
  - **Acceptance criteria:**
    - All dynamic lists use stable, unique keys (item ID, or generated UUID for new items)
    - Static lists (e.g., ProgressSegmented steps) documented as safe for index keys
    - ScopeBuilder milestones use milestone IDs or temporary UUIDs
    - CreateProjectPage objectives/constraints use generated IDs
    - No `key={index}` or `key={i}` on lists that can be reordered or mutated
  - **Story points:** 5

### From Epic 3.11: Global CSS Transition Fix

- [ ] **Feature 3.11.1: Scope global `*` transition rule to prevent unintended animations (2 points)** -- Medium
  - *Why this level:* Requires identifying all elements that rely on the global transition and adding explicit classes. Needs careful visual regression checking across the app.
  - **File(s):** `/frontend/src/index.css:142-146`
  - **What:** `* { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-duration: 0.3s; }` applies a 0.3s transition to EVERY element for color-related properties. This causes unintended animations on modals appearing, dropdown opens, skeleton screens, and any dynamic content.
  - **Why:** Performance impact (browser must check transitions on every DOM element) and visual bugs (flash of wrong color on mount, skeleton pulse affected).
  - **Acceptance criteria:**
    - Global `*` transition rule removed
    - Explicit `transition-colors` Tailwind class added to elements that need hover transitions (buttons, links, cards)
    - Modal/dialog appearance is instant (no color fade)
    - Skeleton animations work correctly
    - `prefers-reduced-motion` media query still respected
  - **Story points:** 2

---

## From Release 4: Performance and Scale

### From Epic 4.2: React Query Caching Strategy

- [ ] **Feature 4.2.1: Implement stale-while-revalidate caching for list queries (3 points)** -- Medium
  - *Why this level:* React Query configuration changes. Requires understanding stale time vs cache time and their effects on data freshness. Well-documented pattern.
  - **File(s):** `/frontend/src/hooks/useProjects.ts`, `/frontend/src/hooks/usePayments.ts`, `/frontend/src/main.tsx:11-13`
  - **What:** Current `staleTime: 60 * 1000` (1 minute) means data refetches every minute. For data that changes infrequently (project list, client list, developer list), increase stale time to 5 minutes with background refetch on window focus.
  - **Why:** Reducing unnecessary API calls improves performance and reduces load on the adapter API.
  - **Acceptance criteria:**
    - List queries: `staleTime: 5 * 60 * 1000` (5 minutes)
    - Detail queries: `staleTime: 2 * 60 * 1000` (2 minutes)
    - Mutations invalidate relevant queries immediately
    - `refetchOnWindowFocus: true` for list queries (re-enabled)
    - User-facing data freshness is acceptable
  - **Story points:** 3

### From Epic 4.6: Component Rendering Performance

- [ ] **Feature 4.6.1: Memoize expensive list renders (3 points)** -- Medium
  - *Why this level:* Requires understanding React.memo, useCallback, and when memoization is beneficial. Standard React performance pattern.
  - **File(s):** `/frontend/src/pages/dashboard/DashboardPage.tsx`, `/frontend/src/pages/projects/ProjectsPage.tsx`
  - **What:** DashboardPage (878 lines) has 8 sub-components defined inline. Every parent re-render recreates all child component definitions. Extract sub-components to module scope and memoize with `React.memo` where props are stable.
  - **Why:** Kanban board with many milestone cards re-renders all cards on any state change (filter, search, tab switch).
  - **Acceptance criteria:**
    - All sub-components extracted to module scope (not inline functions)
    - `React.memo` applied to: MilestoneCard, ProjectCard, KanbanColumn, FilterChip
    - Callback props memoized with `useCallback` where passed to memoized children
    - React DevTools Profiler shows reduced re-renders on filter/search changes
  - **Story points:** 3

- [ ] **Feature 4.6.2: Virtualize long lists (2 points)** -- Medium
  - *Why this level:* Library integration following documented patterns. Requires understanding virtual scrolling concepts but @tanstack/react-virtual provides clear API.
  - **File(s):** `/frontend/src/pages/dashboard/DashboardPage.tsx` (milestone list in Kanban columns)
  - **What:** If a user has many milestones (50+), all are rendered in the DOM simultaneously. Add windowing/virtualization for Kanban columns that exceed a threshold (e.g., 20 items).
  - **Why:** DOM node count affects scroll performance, especially on mobile devices.
  - **Acceptance criteria:**
    - Kanban columns with >20 milestones use virtual scrolling
    - `@tanstack/react-virtual` or similar library used
    - Smooth scroll maintained
    - No visual difference for columns with <20 items
  - **Story points:** 2

---

## From Release 5: Polish and DX

### From Epic 5.1: Storybook Component Playground

- [ ] **Feature 5.1.1: Set up Storybook with existing components (8 points)** -- Medium
  - *Why this level:* Tooling and configuration task. Requires writing stories for each component which is repetitive but well-documented. No architectural decisions needed.
  - **File(s):** New `/frontend/.storybook/`, stories for all `/frontend/src/components/ui/` components
  - **What:** No Storybook or component playground. `ComponentsDemo.tsx` page exists but is not linked in routing. Set up Storybook with stories for all 14 UI components: Badge, Button, Card, CardWidget, Combobox, Input, Label, Spinner, TabsLine, TextArea, Avatar, AvatarLabel, FeedItem, etc.
  - **Why:** Component playground accelerates UI development and enables visual regression testing.
  - **Acceptance criteria:**
    - Storybook configured with Vite builder
    - Dark theme matching app theme
    - Stories for every component in `/components/ui/`
    - Each story shows all variants, sizes, and states
    - Controls panel for interactive prop editing
    - `npm run storybook` script in package.json
    - ComponentsDemo.tsx route added to routing (or removed if Storybook replaces it)
  - **Story points:** 8

### From Epic 5.2: Page Transitions and Animations

- [ ] **Feature 5.2.1: Add framer-motion for page transitions (5 points)** -- Medium
  - *Why this level:* Library integration with documented patterns. Requires understanding animation concepts and Suspense interaction but framer-motion has clear API.
  - **File(s):** `/frontend/package.json`, `/frontend/src/App.tsx`, new `/frontend/src/components/shared/PageTransition.tsx`
  - **What:** No page transitions exist. Navigation is instant with no visual feedback. Add framer-motion with subtle fade+slide transitions between routes.
  - **Why:** Transitions provide visual continuity and make the app feel polished. They signal to users that content has changed.
  - **Acceptance criteria:**
    - framer-motion installed
    - `PageTransition` wrapper component with configurable animation
    - Default: 200ms fade + 8px vertical slide
    - Respects `prefers-reduced-motion` (instant transition)
    - Works with React.lazy Suspense boundaries
    - No janky intermediate states
    - Exit animations complete before new page mounts
  - **Story points:** 5

- [ ] **Feature 5.2.2: Add micro-interactions to interactive elements (3 points)** -- Medium
  - *Why this level:* CSS/framer-motion animations on existing components. Creative task but technically straightforward. Each interaction is independent.
  - **File(s):** Various UI components
  - **What:** Add subtle animations to: button press (scale), card hover (elevation), toast enter/exit, modal backdrop, loading transitions.
  - **Why:** Micro-interactions provide feedback that the interface is responsive.
  - **Acceptance criteria:**
    - Button: scale(0.98) on press, 100ms
    - Card: subtle shadow increase on hover, 200ms
    - Toast: slide-in from right, fade-out
    - Modal: backdrop fade 200ms, content scale from 0.95
    - All animations respect `prefers-reduced-motion`
  - **Story points:** 3

### From Epic 5.3: Form UX Improvements

- [ ] **Feature 5.3.2: Add form field validation feedback improvements (3 points)** -- Medium
  - *Why this level:* Enhancing existing forms with react-hook-form validation display patterns. Each form is independently addressable. Requires UX judgment on feedback timing.
  - **File(s):** All form pages (CreateProjectPage, ClientProfilePage, DeveloperProfilePage, ScopeBuilder)
  - **What:** Form validation errors appear only after submit attempt. Add real-time validation with: field-level error messages on blur, character counts for text areas, required field indicators (*), disabled submit until form is valid.
  - **Why:** Users fill out a long form, submit, and see errors they could have caught earlier.
  - **Acceptance criteria:**
    - Required fields marked with visual indicator
    - Validation on blur (not on every keystroke)
    - Error messages appear below the field with red text
    - Character count for description/bio textareas
    - Submit button disabled until required fields are filled
    - Error summary at top of form on submit attempt
  - **Story points:** 3

### From Epic 5.4: Typography Enhancement

- [ ] **Feature 5.4.1: Evaluate and optionally replace Inter with distinctive typography (3 points)** -- Medium
  - *Why this level:* Design evaluation and font configuration task. Requires typographic awareness and brand thinking. Implementation is straightforward once font is chosen.
  - **File(s):** `/frontend/src/index.css:1,69`, `/frontend/tailwind.config.ts`
  - **What:** Inter is generic and used by thousands of applications. For a blockchain product, consider a more distinctive font for headings (e.g., Space Grotesk, Outfit, or custom) while keeping Inter for body text.
  - **Why:** Brand differentiation. Inter is the "default modern font" -- it signals "template" rather than "product."
  - **Acceptance criteria:**
    - Typography evaluation document with 3 options + rationale
    - If approved: heading font installed and configured
    - Body text remains Inter (readability)
    - Font loading optimized (preload, swap)
    - All `style={{ fontFamily: 'Inter' }}` already removed (from Feature 3.8.1)
    - Figma designs updated if font changes
  - **Story points:** 3

### From Epic 5.8: Documentation

- [ ] **Feature 5.8.2: Add ADR for architecture decisions (2 points)** -- Medium
  - *Why this level:* Technical writing requiring architectural understanding to document WHY decisions were made. Needs ability to articulate tradeoffs and alternatives.
  - **File(s):** New `/frontend/docs/adr/001-direct-api-architecture.md`, `/frontend/docs/adr/002-state-management.md`
  - **What:** Document key architecture decisions: (a) why direct API calls instead of Express backend proxy, (b) why Zustand + React Query instead of Redux, (c) why custom blake2b instead of library, (d) why CDN SDK import.
  - **Why:** Future developers need to understand WHY decisions were made, not just what was built.
  - **Acceptance criteria:**
    - ADR template following MADR format
    - ADR-001: Direct API architecture (context, decision, consequences)
    - ADR-002: State management approach
    - ADR-003: Blockchain codec implementation
    - Each ADR includes alternatives considered and rationale
  - **Story points:** 2

---

# Advance -- Senior Developers (133 points, 30 features)

## From Release 1: Production Readiness

### From Epic 1.1: Financial Flow Integrity

- [ ] **Feature 1.1.1: Replace hardcoded `documentHash` with real hash computation (3 points)** -- Advance
  - *Why this level:* Requires understanding blockchain on-chain proof mechanisms, choosing between SHA-256 and blake2b, ensuring deterministic serialization of scope data. Touches the financial audit trail.
  - **File(s):** `/frontend/src/hooks/useScope.ts:79`
  - **What:** The scope submission sends a hardcoded `'0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'` as the document hash. This must be replaced with an actual hash of the scope document (milestones + metadata). Implement a function that computes a SHA-256 or blake2b hash of the serialized scope data.
  - **Why:** The document hash is stored on-chain as proof of the scope agreement. A hardcoded value means every scope submission produces the same hash, making the on-chain audit trail meaningless. In a dispute, neither party can prove what was agreed upon.
  - **Acceptance criteria:**
    - Document hash is computed from the actual milestone data (titles, descriptions, budgets, delivery dates)
    - Hash changes when any milestone property changes
    - Hash is deterministic (same input produces same output)
    - Unit test covers hash computation with known inputs
  - **Story points:** 3

### From Epic 1.2: Security Hardening

- [ ] **Feature 1.2.1: Move auth token from localStorage to httpOnly cookie (8 points)** -- Advance
  - *Why this level:* Security-critical change touching auth flow, CSRF protection, cookie management, backend endpoint creation, and the 401 retry queue. Requires deep understanding of web security, token lifecycle, and cross-origin concerns.
  - **File(s):** `/frontend/src/stores/authStore.ts:53-58`, `/frontend/src/api/adapter/client.ts:35-44`, `/frontend/src/lib/virto-sdk.ts:115-123`
  - **What:** The auth token (which has blockchain signing authority) is stored in plain localStorage via Zustand's `persist` middleware. Any XSS vulnerability gives full access to this token. Migration requires: (a) backend endpoint to set httpOnly cookie, (b) frontend to stop sending Bearer token in headers when cookie is available, (c) CSRF protection since cookies are sent automatically, (d) token renewal flow update.
  - **Why:** localStorage tokens are accessible to any JavaScript running on the page. A single XSS vector (e.g., the unsanitized URL in finding 1.2.2) exposes the signing key.
  - **Acceptance criteria:**
    - Token stored in httpOnly, Secure, SameSite=Strict cookie
    - Bearer token header removed from adapter client interceptor
    - CSRF token implemented for mutation endpoints
    - Token renewal works through cookie refresh
    - Zustand store only persists user info, not token
    - Logout clears cookie server-side
    - Works with the 401 interceptor retry queue
  - **Story points:** 8

### From Epic 1.3: SDK and Dependency Security

- [ ] **Feature 1.3.1: Add SRI hash to Virto SDK CDN import (2 points)** -- Advance
  - *Why this level:* Supply chain security requiring understanding of SRI, import maps, build-time plugins, and the SDK's role in WebAuthn authentication. Wrong approach could break auth entirely.
  - **File(s):** `/frontend/src/lib/virto-sdk.ts:10`
  - **What:** The SDK is loaded via `import SDK from 'https://cdn.jsdelivr.net/npm/@virtonetwork/sdk@0.0.4-alpha.36/dist/esm/index.js'` with no Subresource Integrity (SRI) hash. If jsdelivr CDN is compromised, any malicious code executes with full page access.
  - **Why:** Supply chain attack vector. The SDK handles WebAuthn authentication and blockchain signing. CDN compromise = complete auth bypass.
  - **Acceptance criteria:**
    - SRI hash added via import map or build-time plugin
    - Alternative: bundle the SDK locally as a dependency (preferred)
    - Fallback loading strategy if CDN fails
    - `@ts-expect-error` comment removed if SDK is bundled locally
  - **Story points:** 2

- [ ] **Feature 1.3.2: Add CDN fallback for Virto SDK (3 points)** -- Advance
  - *Why this level:* Requires designing a resilient SDK loading strategy with timeout, fallback, and retry. The SDK is the authentication gateway -- failure handling is critical.
  - **File(s):** `/frontend/src/lib/virto-sdk.ts:10`
  - **What:** Single CDN dependency with no fallback. If jsdelivr is down, the entire auth flow breaks. Implement: (a) try CDN load, (b) on failure, load from bundled local copy or alternate CDN, (c) timeout after reasonable period.
  - **Why:** Single point of failure for authentication. CDN outages happen regularly (jsdelivr had multiple in 2024-2025).
  - **Acceptance criteria:**
    - Primary load from CDN with timeout (5s)
    - Fallback to bundled local copy
    - Error shown to user if both fail
    - SDK initialization retried on page load
  - **Story points:** 3

### From Epic 1.4: Critical Test Infrastructure

- [ ] **Feature 1.4.4: Unit tests for React Query hooks (8 points)** -- Advance
  - *Why this level:* Requires deep understanding of React Query internals, Zustand store interaction within queryFn, cache invalidation patterns, and renderHook testing. Complex mocking and state interaction patterns.
  - **File(s):** `/frontend/src/hooks/useScope.ts`, `/frontend/src/hooks/usePayments.ts`, `/frontend/src/hooks/useProjects.ts`, `/frontend/src/hooks/useProfile.ts`, `/frontend/src/hooks/useAuth.ts`, `/frontend/src/hooks/useMilestones.ts`, `/frontend/src/hooks/useVotes.ts`, `/frontend/src/hooks/useRatings.ts`
  - **What:** Test all hooks using `@testing-library/react-hooks` or React Testing Library's `renderHook`. Verify query key structures, cache invalidation on mutations, error states, and Zustand store reads inside queryFn.
  - **Why:** Hooks orchestrate all data flow. Testing them validates the contract between UI and API.
  - **Acceptance criteria:**
    - Every mutation hook tested for: success path, error path, cache invalidation
    - Every query hook tested for: loading state, data shape, error state, disabled state
    - `useAuthStore.getState()` reads inside `queryFn` are tested (finding #45)
    - `useSubmitScope` tested with hardcoded values (validates current behavior before fix)
    - Minimum 75% coverage for hooks/
  - **Story points:** 8

- [ ] **Feature 1.4.6: Unit tests for blake2b128 codec implementation (3 points)** -- Advance
  - *Why this level:* Requires understanding blockchain cryptographic primitives, SCALE codec, SS58 address encoding, and storage key construction. Must validate against official test vectors.
  - **File(s):** `/frontend/src/api/kreivo/codec.ts`, new `/frontend/src/api/kreivo/codec.test.ts`
  - **What:** Custom blake2b-128 implementation handles only single-block inputs (up to 128 bytes). Test with known test vectors from the blake2 specification. Test SS58 decode, SCALE compact decode, balance decode, and storage key construction.
  - **Why:** Incorrect blake2b implementation means wrong storage keys, which means wrong balance queries, which means users see incorrect wallet amounts in a financial application.
  - **Acceptance criteria:**
    - blake2b128 tested against official blake2b-128 test vectors
    - Input > 128 bytes throws or handles gracefully (documented limitation)
    - `ss58ToAccountId` tested with known Kreivo addresses
    - `decodeCompact` tested with all 4 modes (single-byte, two-byte, four-byte, big integer)
    - `decodeSystemAccount` and `decodeAssetsAccount` tested with real chain data
    - `systemAccountKey` and `assetsAccountKey` produce correct hex strings
  - **Story points:** 3

### From Epic 1.5: Type Safety for Financial Paths

- [ ] **Feature 1.5.1: Eliminate `as unknown as Project` type casts in projectService (5 points)** -- Advance
  - *Why this level:* Deep type system refactor requiring understanding of API response shapes, TypeScript generics, transformer pattern design, and ensuring zero runtime regressions on financial data paths.
  - **File(s):** `/frontend/src/services/projectService.ts:125,294,419`
  - **What:** Three functions end with `as unknown as Project` or `as unknown as Milestone[]`, bypassing TypeScript safety completely. The root cause is that API responses are typed as `Record<string, unknown>` and mutated in place with `cleanProject()`. Refactor to: (a) define raw API response types, (b) create typed transformer functions that return new objects (no mutation), (c) eliminate all `as unknown as` casts.
  - **Why:** `as unknown as` tells TypeScript "I know better than you" -- it hides real type mismatches. If the API response shape changes, the cast silently produces wrong data.
  - **Acceptance criteria:**
    - Zero `as unknown as` casts in projectService.ts
    - Raw API response interfaces defined (e.g., `RawProjectResponse`, `RawMilestoneResponse`)
    - Transformer functions return new objects (no `delete` mutation)
    - TypeScript catches missing/renamed fields at compile time
    - All existing functionality preserved (verified by tests from 1.4.3)
  - **Story points:** 5

- [ ] **Feature 1.5.2: Eliminate `as unknown as` casts in clientService and developerService (3 points)** -- Advance
  - *Why this level:* Same deep type refactor as 1.5.1 applied to client/developer data pipelines. Requires consistent transformer architecture across services.
  - **File(s):** `/frontend/src/services/clientService.ts:52,61`, `/frontend/src/services/developerService.ts:59,68`
  - **What:** Both services cast to `Record<string, unknown>` to use `cleanClient()`/`cleanDeveloper()` which mutate via `delete`. Same fix pattern as 1.5.1: define raw types, create transformers.
  - **Why:** Same risk as 1.5.1 -- type safety bypass on data flowing to UI components.
  - **Acceptance criteria:**
    - Zero `as unknown as` in clientService.ts and developerService.ts
    - `cleanClient` and `cleanDeveloper` replaced with pure transformer functions
    - Typed return values for all service functions
  - **Story points:** 3

- [ ] **Feature 1.5.3: Eliminate `as unknown as` casts in useScope and useProfile hooks (3 points)** -- Advance
  - *Why this level:* Hooks layer type refactor touching financial scope submission and profile update payloads. Requires understanding the full data flow from form to API.
  - **File(s):** `/frontend/src/hooks/useScope.ts:73`, `/frontend/src/hooks/useProfile.ts:399,404`
  - **What:** `useScope.ts` casts milestones to `Record<string, unknown>[]`. `useProfile.ts` casts client/developer to `ClientUpdateData`/`DeveloperUpdateData`. These indicate type mismatches between the domain types and what the API expects.
  - **Why:** Profile update payload construction relies on casting -- if the types diverge, users get silent data corruption.
  - **Acceptance criteria:**
    - Zero `as unknown as` in useScope.ts and useProfile.ts
    - Milestone budget conversion has explicit typed intermediate steps
    - Profile update payload builders accept properly typed inputs
  - **Story points:** 3

### From Epic 1.6: Navigation and Auth Guards

- [ ] **Feature 1.6.2: Replace hard `window.location.href` navigation with React Router (3 points)** -- Advance
  - *Why this level:* Cross-cutting change touching the 401 interceptor, error pages, and SPA navigation architecture. Requires designing an event-based auth navigation system that preserves React Query cache.
  - **File(s):** `/frontend/src/api/adapter/client.ts:137`, `/frontend/src/pages/profiles/ClientProfilePage.tsx:167`, `/frontend/src/pages/profiles/DeveloperProfilePage.tsx:237`, `/frontend/src/pages/dashboard/DashboardPage.tsx:246`, `/frontend/src/pages/projects/ProjectsPage.tsx:114`
  - **What:** 5 locations use `window.location.href` or `window.location.reload()` which cause full page reloads, losing all React state and React Query cache. The 401 interceptor (`client.ts:137`) should use a navigation event that React can handle. The 4 error pages should use React Query's `refetch()` instead of `reload()`.
  - **Why:** Full page reloads destroy the SPA experience, clear all cached data, and force users to re-authenticate through the entire WebAuthn flow.
  - **Acceptance criteria:**
    - 401 interceptor emits an event (custom event or Zustand action) that `App.tsx` listens to for navigation
    - Error pages use React Query `refetch()` instead of `window.location.reload()`
    - No `window.location` usage remains in the codebase
    - Navigation preserves React Query cache where appropriate
  - **Story points:** 3

### From Epic 1.7: API Client Reliability

- [ ] **Feature 1.7.2: Fix `performWebAuthnLogin` bypassing adapterClient interceptors (3 points)** -- Advance
  - *Why this level:* Touches the authentication flow directly. Requires understanding the difference between authenticated and unauthenticated HTTP clients, interceptor chains, and WebAuthn response handling.
  - **File(s):** `/frontend/src/lib/virto-sdk.ts:115-123`
  - **What:** `performWebAuthnLogin` makes a direct `fetch()` call to `/adapter/v1/auth/custom-connect`, bypassing the `adapterClient` axios instance and its interceptors (auth headers, error handling, timeout). This means the login call has no consistent error handling, no timeout, and no retry logic.
  - **Why:** Inconsistent HTTP client usage means this endpoint has different behavior from all other adapter calls. Errors are not standardized, making debugging harder.
  - **Acceptance criteria:**
    - Login call uses `adapterClient` (or a dedicated unauthenticated client)
    - Consistent error handling with other adapter calls
    - Timeout applied (shorter for auth: 15 seconds)
    - Response type properly defined
  - **Story points:** 3

---

## From Release 2: Quality and Stability

### From Epic 2.1: Runtime Validation with Zod

- [ ] **Feature 2.1.1: Add Zod schemas for adapter API responses (5 points)** -- Advance
  - *Why this level:* Requires designing the validation architecture for the entire API boundary. Defines patterns that 2.1.2 and 2.1.3 will follow. Must handle partial responses, optional fields, and backward compatibility.
  - **File(s):** New `/frontend/src/api/adapter/schemas.ts`, modifications to all adapter API modules
  - **What:** Zod is installed (`package.json:24`) but completely unused. Define Zod schemas for all adapter API response shapes (clients, developers, projects, milestones, ratings). Parse responses at the API boundary before passing to services.
  - **Why:** API responses are the most dangerous boundary -- external data enters the application. Without validation, a backend change silently breaks the frontend with runtime errors far from the root cause.
  - **Acceptance criteria:**
    - Zod schemas defined for: Client, Developer, Project, Milestone, Rating, AuthResponse, Team
    - Every adapter API function parses response through schema before returning
    - Parse errors throw descriptive errors with schema path
    - Schemas serve as both validation and type generation (replaces manual types)
    - Unit tests validate schemas against realistic API responses
  - **Story points:** 5

- [ ] **Feature 2.1.2: Add Zod schemas for virto API responses (3 points)** -- Advance
  - *Why this level:* Virto API handles authentication and payment data -- the two most security-critical boundaries. Requires understanding WebAuthn response shapes and payment data structures.
  - **File(s):** New `/frontend/src/api/virto/schemas.ts`, modifications to virto API modules
  - **What:** Same as 2.1.1 but for virto API: WebAuthn responses, payment responses, membership responses.
  - **Why:** Virto API handles authentication and payment data -- the two most security-critical boundaries.
  - **Acceptance criteria:**
    - Zod schemas for: auth responses, payment create/release/get, membership responses
    - All virto API functions validate responses
    - Type inference from schemas replaces manual interfaces
  - **Story points:** 3

### From Epic 2.2: Error Handling Consolidation

- [ ] **Feature 2.2.1: Unify three nearly identical error handling patterns (5 points)** -- Advance
  - *Why this level:* Cross-cutting architectural change affecting all three API clients. Requires designing a unified error class hierarchy and ensuring all catch blocks remain compatible.
  - **File(s):** `/frontend/src/api/adapter/client.ts:154-179` (`handleApiError`), `/frontend/src/api/virto/client.ts:57-68` (`handleVirtoError`), `/frontend/src/api/contracts/index.ts:122-133` (`handleError`)
  - **What:** Three separate error handler functions with nearly identical logic: log context, extract message, throw enhanced error. Three separate error classes (`Error` with extra fields, `VirtoApiError`, `ContractsApiError`). Consolidate into a single `ApiError` class and `handleApiError()` utility.
  - **Why:** DRY violation. Three copies of the same logic means three places to update if error handling needs change. Different error shapes make catch blocks inconsistent.
  - **Acceptance criteria:**
    - Single `ApiError` class in `api/errors.ts` with: message, statusCode, context, originalError, source (adapter/virto/contracts)
    - Single `handleApiError(error, context, source)` function
    - All three API clients use the unified handler
    - Error boundary correctly renders all error types
    - Existing catch blocks still work with the unified error type
  - **Story points:** 5

- [ ] **Feature 2.2.2: Add error boundary integration with mutation errors (3 points)** -- Advance
  - *Why this level:* Requires understanding React error boundaries, React Query mutation lifecycle, and designing a global mutation error handling strategy with user-facing feedback.
  - **File(s):** `/frontend/src/components/shared/ErrorBoundary.tsx`, hooks with mutations
  - **What:** The `ErrorBoundary` only catches rendering errors. Mutation errors (API failures during submit, approve, reject) are handled inconsistently -- some show nothing, some log to console. Add `onMutationError` callbacks that surface errors to the user via the toast system (see Release 3).
  - **Why:** Users click "Submit" and nothing happens. No feedback on why the action failed.
  - **Acceptance criteria:**
    - Global mutation error handler configured in QueryClient
    - Mutation errors surface to user via notification/toast
    - ErrorBoundary enhanced to accept programmatic error triggers
    - Critical mutations (scope submit, payment) have specific error messages
  - **Story points:** 3

### From Epic 2.5: Data Fetching Optimization

- [ ] **Feature 2.5.1: Fix N+1 sequential API calls in getProjectDevelopers (5 points)** -- Advance
  - *Why this level:* Performance optimization requiring understanding of the N+1 problem, Promise.allSettled patterns, and careful reordering of filter-then-fetch logic to reduce API calls.
  - **File(s):** `/frontend/src/services/developerService.ts:87-107`
  - **What:** `getProjectDevelopers()` has a `for...of` loop that calls `getWorkerAddress(email)` sequentially for EVERY developer, then filters. This is O(N) sequential HTTP calls where N is the total developer count (not just project developers).
  - **Why:** With 50 developers, this makes 50 sequential API calls just to resolve addresses, plus the team and developers calls. Page load grows linearly with platform size.
  - **Acceptance criteria:**
    - Worker addresses resolved in parallel with `Promise.allSettled`
    - Only project team members' addresses resolved (filter first, then resolve)
    - Fallback for failed address resolutions
    - Total API calls reduced from N+2 to 3 (team, developers, batch addresses)
  - **Story points:** 5

- [ ] **Feature 2.5.2: Deduplicate getProjectsIndex calls between useDashboard and usePayments (3 points)** -- Advance
  - *Why this level:* Requires redesigning React Query key architecture to share data between hooks while maintaining independent cache invalidation. Cross-cutting change affecting data flow.
  - **File(s):** `/frontend/src/hooks/usePayments.ts:52-54`, `/frontend/src/hooks/useProjects.ts` (useDashboard)
  - **What:** Both `usePayments()` and `useDashboard()` call `getProjectsIndex()` with the same parameters. React Query could cache this, but they use different query keys (`['payments', 'list']` vs `['projects', 'dashboard']`), so the same data is fetched twice.
  - **Why:** Double the API calls for the same data. On the dashboard page where both may be active, this doubles the already expensive N+1 fetch.
  - **Acceptance criteria:**
    - Shared query key for the base project list data
    - `usePayments` and `useDashboard` build on the shared query (select/transform)
    - Single fetch serves both hooks
    - Cache invalidation still works correctly for both consumers
  - **Story points:** 3

### From Epic 2.9: Zustand Store Token Access Pattern

- [ ] **Feature 2.9.1: Fix Zustand store reads inside React Query queryFn (5 points)** -- Advance
  - *Why this level:* Requires deep understanding of React Query dependency tracking, Zustand subscription model, and designing a token injection pattern that works across all hooks. Architectural decision with multiple valid approaches.
  - **File(s):** `/frontend/src/hooks/usePayments.ts:53`, `/frontend/src/hooks/useScope.ts:62`, and all hooks calling `useAuthStore.getState()`
  - **What:** Multiple hooks call `useAuthStore.getState().token` inside `queryFn` or `mutationFn`. This token read is invisible to React Query's dependency tracking -- if the token changes (refresh), stale queries won't know to refetch. Move token to a dependency that React Query tracks, or pass it through the query key.
  - **Why:** After token refresh, cached queries may use stale tokens, causing 401 errors that trigger unnecessary re-authentication loops.
  - **Acceptance criteria:**
    - Token passed as parameter to service functions (not read from store inside queryFn)
    - Or: token included in query key so queries refetch on token change
    - Or: custom QueryClient defaultOptions that inject token via context
    - Pattern documented for future hooks
    - Token refresh triggers appropriate query invalidation
  - **Story points:** 5

---

## From Release 3: UX Excellence

### From Epic 3.1: Toast/Notification System

- [ ] **Feature 3.1.1: Implement toast notification system (8 points)** -- Advance
  - *Why this level:* Full component system design: Zustand store, React component, hook API, accessibility (aria-live), animations, stacking logic, and integration with ALL existing mutations across the app.
  - **File(s):** New `/frontend/src/components/ui/Toast.tsx`, new `/frontend/src/hooks/useToast.ts`, new `/frontend/src/stores/toastStore.ts`
  - **What:** No user feedback mechanism exists for mutation results. Implement a toast/notification system: success (green), error (red), warning (amber), info (blue). Auto-dismiss after 5 seconds, manual dismiss, stack up to 3 toasts, animate in/out.
  - **Why:** Users perform actions (submit scope, approve milestone, reject proposal) with zero feedback on success or failure. This creates uncertainty and repeated clicks.
  - **Acceptance criteria:**
    - Toast component with 4 variants (success, error, warning, info)
    - Zustand store for toast state management
    - `useToast()` hook for triggering toasts from any component
    - Auto-dismiss with configurable duration
    - Stacking with max visible count
    - Keyboard dismissible (Escape)
    - Screen reader announcements (aria-live="polite")
    - All existing mutations connected to toast notifications
    - Positioned bottom-right (Figma standard)
  - **Story points:** 8

### From Epic 3.4: WCAG Accessibility

- [ ] **Feature 3.4.4: Add focus management on route transitions (3 points)** -- Advance
  - *Why this level:* Requires understanding React Router lifecycle, focus management APIs, scroll restoration, and the interplay between keyboard focus and mouse users. Must not disrupt mouse user experience while improving keyboard/screen reader navigation.
  - **File(s):** `/frontend/src/App.tsx`, or new `/frontend/src/hooks/useFocusOnNavigate.ts`
  - **What:** When navigating between pages, focus stays on the previously clicked link/button. Screen reader users and keyboard users don't know they've navigated to a new page. Focus should move to the page heading or main content on route change.
  - **Why:** WCAG 2.4.3 Focus Order. Without focus management, keyboard users lose their place after navigation.
  - **Acceptance criteria:**
    - Focus moves to the page `<h1>` on route change
    - Alternatively, focus moves to `#main-content`
    - Screen reader announces the new page
    - Focus move is imperceptible to mouse users (no visible focus ring on heading unless user is keyboard-navigating)
    - Back navigation restores previous scroll position
  - **Story points:** 3

---

## From Release 4: Performance and Scale

### From Epic 4.1: Route-Level Code Splitting

- [ ] **Feature 4.1.1: Add React.lazy() to all protected page routes (8 points)** -- Advance
  - *Why this level:* Requires understanding Webpack/Vite chunk splitting, Suspense boundaries, route-level prefetching strategies, and measuring bundle impact. Architectural change affecting the entire routing layer.
  - **File(s):** `/frontend/src/App.tsx:17-31`
  - **What:** Only `DaoViewPage` uses `React.lazy()`. All other 14 protected pages are eagerly imported. Convert to lazy loading: DashboardPage, ProjectsPage, CreateProjectPage, ProjectDetailPage, ScopeReviewPage, ProfilePage, SettingsPage, PaymentsPage, PaymentDetailPage, PaymentFundPage, MilestoneReviewPage, TeamEvaluationPage, DeveloperEvaluationPage, ConsultantEvaluationPage.
  - **Why:** Initial bundle includes all pages. Users who only visit the dashboard download code for project creation, scope review, payments, etc.
  - **Acceptance criteria:**
    - All protected pages lazy loaded with `React.lazy()`
    - Each page in its own chunk (verify with `vite build --report`)
    - `Suspense` boundary with skeleton fallback per route group
    - Auth pages remain eagerly loaded (they're the entry point)
    - Prefetch hints for likely next pages (e.g., dashboard prefetches projects)
    - No visible loading delay on fast connections
    - Total initial JS bundle reduced by >30%
  - **Story points:** 8

### From Epic 4.2: React Query Caching Strategy

- [ ] **Feature 4.2.2: Add optimistic updates to mutations (5 points)** -- Advance
  - *Why this level:* Requires deep understanding of React Query's optimistic update API (onMutate, onError, onSettled), cache manipulation, rollback strategies, and handling slow blockchain operations. Financial data correctness is critical.
  - **File(s):** `/frontend/src/hooks/useScope.ts`, `/frontend/src/hooks/useMilestones.ts`, `/frontend/src/hooks/usePayments.ts`, `/frontend/src/hooks/useProjects.ts`
  - **What:** No mutations use `onMutate` for optimistic updates. Every action waits for the full API round-trip (including blockchain operations which can take 10+ seconds) before updating the UI.
  - **Why:** Blockchain operations are slow. Optimistic updates make the UI feel instant while the operation processes in the background. Rollback on failure.
  - **Acceptance criteria:**
    - Scope submit: milestone list optimistically updated to "submitted" state
    - Scope accept/reject: project state optimistically updated
    - Milestone complete: milestone state optimistically updated
    - All optimistic updates have `onError` rollback
    - Toast notification on rollback: "Action failed, changes reverted"
    - Loading indicator shows background operation in progress
  - **Story points:** 5

### From Epic 4.3: Retry Logic and Circuit Breaker

- [ ] **Feature 4.3.1: Add retry logic with exponential backoff for adapter API calls (3 points)** -- Advance
  - *Why this level:* Requires understanding distributed systems retry patterns, exponential backoff with jitter, and coordinating retry behavior between axios interceptors and React Query. Must avoid double-retry cascades.
  - **File(s):** `/frontend/src/api/adapter/client.ts`, `/frontend/src/main.tsx:14`
  - **What:** No retry logic for API calls (React Query `retry: 1` is a single immediate retry). Implement exponential backoff with jitter: 1s, 2s, 4s for transient failures (5xx, network errors). Do NOT retry 4xx errors.
  - **Why:** External APIs have transient failures. A single retry without backoff can overwhelm a struggling server.
  - **Acceptance criteria:**
    - Axios retry interceptor with exponential backoff (1s, 2s, 4s)
    - Jitter added to prevent thundering herd
    - Only retries 5xx and network errors
    - 4xx errors fail immediately
    - Maximum 3 retries
    - React Query retry aligned with axios retry (avoid double retry)
    - Retry count visible in error messages for debugging
  - **Story points:** 3

- [ ] **Feature 4.3.2: Add circuit breaker for external API health (2 points)** -- Advance
  - *Why this level:* System design pattern (circuit breaker with state machine: closed/open/half-open). Requires understanding failure thresholds, recovery testing, and user-facing degradation strategies.
  - **File(s):** New `/frontend/src/api/circuitBreaker.ts`, adapter/virto/contracts clients
  - **What:** If an API consistently fails (e.g., 5 failures in 30 seconds), stop trying and show a service-level error instead of making more failing requests.
  - **Why:** Without circuit breaking, a down API causes cascade of failed requests, timeout waits, and poor UX as every page tries to load.
  - **Acceptance criteria:**
    - Circuit breaker with: closed (normal), open (failing, skip requests), half-open (test single request)
    - Thresholds: 5 failures in 30s = open, 30s timeout = half-open
    - Separate circuit breakers for adapter, virto, contracts
    - User-visible banner: "Service temporarily unavailable. Retrying..."
    - Circuit breaker state persisted in memory (not localStorage)
  - **Story points:** 2

### From Epic 4.4: Fetch Optimization

- [ ] **Feature 4.4.1: Stop fetching ALL clients and ALL developers on every project list call (8 points)** -- Advance
  - *Why this level:* Data architecture redesign requiring individual entity caching, batch lookup utilities, and rethinking the service layer's data composition pattern. Scalability-critical change.
  - **File(s):** `/frontend/src/services/projectService.ts:150-153,76-79`
  - **What:** Both `getProject()` and `getProjectsIndex()` call `getClients()` + `getDevelopers()` on every invocation. These return ALL clients and ALL developers in the system just to look up a single client name and consultant name per project. With React Query caching this is less catastrophic than the original N+1, but it's still wasteful.
  - **Why:** As the platform grows, fetching all clients/developers becomes the bottleneck. At 1000 clients, every project page load downloads the entire client database.
  - **Acceptance criteria:**
    - Client and developer lookups use dedicated React Query queries with individual IDs
    - `getClient(id)` and `getDeveloper(id)` calls replace batch `getClients()` / `getDevelopers()`
    - React Query caches individual entities (key: `['client', id]`)
    - Batch lookup utility for project list page (fetch only needed IDs)
    - Total data transferred reduced proportionally to project count vs total users
  - **Story points:** 8

### From Epic 4.5: Real-Time Data Consideration

- [ ] **Feature 4.5.1: Add polling for active project states (5 points)** -- Advance
  - *Why this level:* Requires understanding project lifecycle states to determine which projects need polling, visibility API for tab awareness, and balancing data freshness against API load. Cross-cutting change across multiple hooks.
  - **File(s):** `/frontend/src/hooks/useProjects.ts`, `/frontend/src/hooks/useMilestones.ts`, `/frontend/src/hooks/usePaymentStatus.ts`
  - **What:** No real-time data mechanism exists except for the Kreivo blockchain explorer. Projects in active states (scope validation, milestone review, payment pending) should poll for updates so both parties see changes without manual refresh.
  - **Why:** Client submits scope approval, consultant must refresh to see it. Consultant submits milestone, client must refresh. Creates communication lag in the workflow.
  - **Acceptance criteria:**
    - Active projects (ScopeValidationNeeded, ProjectInProgress) poll every 30 seconds
    - Completed/rejected projects do not poll
    - Polling pauses when page is hidden (visibility API)
    - Polling restarts on page focus
    - New data triggers a subtle UI indicator (not a full page refresh)
    - React Query `refetchInterval` used for implementation
  - **Story points:** 5

---

## From Release 5: Polish and DX

### From Epic 5.3: Form UX Improvements

- [ ] **Feature 5.3.1: Add autosave/draft persistence for multi-step forms (5 points)** -- Advance
  - *Why this level:* Requires designing a draft persistence system with localStorage, debounced saving, draft restoration UX, expiration logic, and beforeunload handling. Complex state lifecycle management.
  - **File(s):** `/frontend/src/pages/projects/CreateProjectPage.tsx`, `/frontend/src/components/features/projects/ScopeBuilder.tsx`
  - **What:** Multi-step forms (project creation with 4 steps, scope builder with unlimited milestones) have no draft persistence. Browser crash or accidental navigation loses all data.
  - **Why:** Project creation is a significant user investment (title, description, objectives, constraints, budget, delivery time). Losing this data causes frustration and abandonment.
  - **Acceptance criteria:**
    - Form state persisted to localStorage on every field change (debounced 500ms)
    - Draft restored on page mount with "Resume draft?" prompt
    - Draft cleared on successful submission
    - Draft expires after 7 days
    - Scope builder milestones persisted per project ID
    - `beforeunload` warning if unsaved changes exist
  - **Story points:** 5

### From Epic 5.6: SettingsPage Implementation

- [ ] **Feature 5.6.1: Implement basic settings page (5 points)** -- Advance
  - *Why this level:* Full page implementation requiring theme system design, preference persistence (localStorage + API), session management, and dangerous operations (delete account, export data). Touches multiple system boundaries.
  - **File(s):** `/frontend/src/pages/settings/SettingsPage.tsx`
  - **What:** SettingsPage is a placeholder ("Settings will be available soon"). Implement: theme preference (dark/light), notification preferences, language preference, session management (view active sessions, logout all).
  - **Why:** Users need control over their experience. The placeholder erodes trust in a production application.
  - **Acceptance criteria:**
    - Theme toggle (dark is default, light mode prepared)
    - Notification preferences (email, in-app)
    - Language preference (English, Spanish)
    - Danger zone: Delete account, Export data
    - All settings persisted (localStorage for theme, API for preferences)
    - Clean form layout matching app design system
  - **Story points:** 5

### From Epic 5.7: Integration and E2E Test Setup

- [ ] **Feature 5.7.1: Set up Playwright for E2E tests (5 points)** -- Advance
  - *Why this level:* E2E test infrastructure requiring understanding of the entire application flow, authenticated test fixtures with WebAuthn mocking, API interception, and CI configuration.
  - **File(s):** New `/frontend/e2e/`, new `playwright.config.ts`
  - **What:** No E2E testing framework. Set up Playwright with tests for 3 critical user journeys: (a) Developer login -> Dashboard -> Project Detail, (b) Client login -> Create Project -> Review scope, (c) Payment flow view.
  - **Why:** Unit tests verify isolated behavior. E2E tests verify the entire flow works together.
  - **Acceptance criteria:**
    - Playwright configured with Chrome and Firefox
    - Test fixtures for authenticated client and developer
    - Journey 1: Developer login -> Dashboard -> navigate to project -> view milestones
    - Journey 2: Client login -> Create project (all steps) -> submit
    - Journey 3: View payments list -> payment detail
    - MSW or similar for API mocking in E2E
    - `npm run test:e2e` script
    - CI-compatible (headless mode)
  - **Story points:** 5

- [ ] **Feature 5.7.2: Set up integration tests for API layer (3 points)** -- Advance
  - *Why this level:* Requires understanding the full data pipeline from API response through service layer to typed domain objects. Must design realistic test fixtures and validate the service-API contract including auth flows.
  - **File(s):** New `/frontend/src/__tests__/integration/`
  - **What:** Integration tests that test service + API layer together with MSW intercepting HTTP calls. Verify the full data pipeline from API response to typed domain object.
  - **Why:** Unit tests mock services. Integration tests verify the service-API contract is correct.
  - **Acceptance criteria:**
    - MSW server setup with realistic response fixtures
    - `getProject()` integration test: API response -> clean + enrich -> typed Project
    - `getProjectsIndex()` integration test: parallel fetch -> deduplicate -> enrich
    - Auth flow integration test: login -> store token -> authenticated request
    - Error flow integration test: 401 -> retry -> new token -> success
  - **Story points:** 3

---

# Summary

## P0 Critical Issues (Product Audit)

| Level | Profile | Features | Points |
|-------|---------|----------|--------|
| P0 Medium | Junior Developers | 3 | 10 |
| P0 Advance | Senior Developers | 5 | 52 |
| **P0 TOTAL** | | **8** | **62** |

## Task Backlog (by skill level)

| Level | Profile | Features | Points | % of Total |
|-------|---------|----------|--------|------------|
| Low | Becarios/Interns | 20 | 41 | 14.5% |
| Medium | Junior Developers | 35 + 3 P0 = 38 | 109 + 10 = 119 | 34.5% |
| Advance | Senior Developers | 30 + 5 P0 = 35 | 133 + 52 = 185 | 53.6% |
| **TOTAL** | | **93** | **345** | **100%** |

> Note: The original TASK_BACKLOG.md summary states 78 features / 300 points.
> The actual count from individually listed features is 85 features / 283 points.
> Adding the 8 P0 issues from the Product Audit brings the total to 93 features / 345 points.
> P0 issues MUST be resolved before any production deployment regardless of sprint planning.
