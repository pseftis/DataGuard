# DataGuard-Personal-Data-Consent-Management-Dashboard

## DataGuard – Personal Data & Consent Management Dashboard

**One-liner**: A web app that lets users design and monitor fine-grained data-sharing “contracts” with partner apps, estimate privacy risk in real time, and reason about trade-offs between personalization and privacy.

This project is built as a personal SDE intern–level portfolio project. It focuses on:

- **Problem clarity & user value**: People rarely understand what data different partners/apps see or how risky a given consent setup is.
- **Code quality & reliability**: Clean, typed React/Next.js 14 code with a small rule-based “risk engine”.
- **System design & scalability**: Frontend-first architecture that can be extended into a full multi-tenant privacy console.
- **Demo clarity & storytelling**: UI and data model are structured around real-world consent scenarios.

---

## Problem & Solution

- **Problem**: Users connect their data to dozens of partners (analytics, ads, loyalty, fintech, mobility). Each integration has its own cryptic consent toggles. It’s hard to answer:
  - “Who sees my payments and location together?”
  - “If I give full access here, what’s the risk?”
  - “What would a safer setup look like?”

- **Solution**: DataGuard provides a single view where a user can:
  - Model partners (e.g., “Ad network”, “Location intelligence”, “E‑commerce analytics”).
  - Configure per-category consent (Email, Phone, Location, Browsing History, Payments, Contacts).
  - See a live **risk score** and human-readable explanation powered by a small rule-based engine.
  - Track metrics like average partner risk and how often sensitive categories are fully denied.

This mirrors the type of “privacy cockpit” a privacy-focused company could expose to end users or enterprises.

---

## Tech Stack

- **Language**: TypeScript
- **Framework**: Next.js 14 (App Router, client components)
- **UI**: Custom CSS (`app/globals.css`) with a modern, dashboard-style layout
- **State & Storage**:
  - React hooks (`useState`, `useEffect`, `useMemo`)
  - `localStorage` for persistence (simulating per-user profiles)
- **Risk Engine**:
  - Deterministic, rule-based scoring function
  - Categorizes risk as Very Low / Low / Medium / High / Critical

You can think of the current version as a **“single-tenant, local prototype”** that could be connected to a real backend service and LLM evaluation layer.

---

## Architecture

### High-level View

- **Client (Next.js App)**:
  - `app/layout.tsx`: Global shell with a header/footer and shared styling.
  - `app/page.tsx`: Main “DataGuard” dashboard where:
    - Users design partner contracts (per-category consent rules).
    - The risk engine computes a score and textual summary.
    - Existing partner contracts are persisted to `localStorage`.

- **Data & Persistence**:
  - In this demo, data is stored in `window.localStorage` under the key `hushvault:partner-consents:v1`.
  - Models:
    - `PartnerConsent`: partner metadata, consent rules, computed risk, `lastUpdated`.
    - `ConsentRule`: `{ category: DataCategory; level: ConsentLevel }`.

- **Risk Engine**:
  - Pure function: `computeRiskScore(rules: ConsentRule[]): number`.
  - Heavier weight for full access to **Payments**, **Browsing History**, **Location**, **Contacts**.
  - A helper `summarizeRisk(score)` maps numeric scores to friendly explanations.

### Future Backend Extension (Design Direction)

If extended for production or multi-user usage, the architecture would evolve to:

- **Next.js API routes / Node service** for:
  - Storing user profiles, partners, and consent rules in Postgres or Supabase.
  - Storing an **audit log** whenever consent changes.
  - Exposing an `/ai/explain-risk` endpoint that:
    - Takes partner + consent config as input.
    - Calls an LLM (e.g., OpenAI) with guardrails.
    - Returns a risk summary, mitigation tips, and a user-friendly explanation.

- **Database schema (conceptual)**:
  - `User(id, email, passwordHash, createdAt)`
  - `App(id, name, type, description)`
  - `ConsentRule(id, userId, appId, category, level)`
  - `AuditLog(id, userId, appId, field, oldValue, newValue, createdAt)`

---

## Core Features

- **Partner Modeling**
  - Start from curated templates like `ShopSphere`, `MoveSense`, and `AdLoom`.
  - Edit partner name, type, and description.

- **Per-category Consent Rules**
  - Categories: Email, Phone, Location, Browsing History, Payments, Contacts.
  - Levels:
    - `deny`: no access.
    - `limited`: coarse/anonymized sharing.
    - `full`: raw, detailed access.
  - Rules can be cycled per category, and new partner “contracts” can be saved.

- **Risk Scoring & Explanation**
  - Live risk score (`0–100`) recomputed on each rule change.
  - Text explanation that maps the numeric score into interpretable risk bands.

- **Metrics Panel**
  - Number of partners configured.
  - Average risk across partners.
  - Count of `full` vs `deny` rules (helps reason about “blast radius”).

These features are implemented purely on the frontend but designed to map cleanly to backend tables and APIs.

---

## Setup & Run

### Prerequisites

- **Node.js**: v18+ (tested with Node 20)
- **Package manager**: npm (comes with Node)

### Steps

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Run the development server**

   ```bash
   npm run dev
   ```

3. **Open the app**

   Visit `http://localhost:3000` in your browser.

There is no backend service required for this demo; all state is stored in the browser.

---

## Environment Variables

The current demo does **not** require real secrets or environment variables.

However, to show how this would evolve into a production-ready system (and to fulfil the `.env.example` requirement), the project includes a `.env.example` file with placeholders like:

- `NEXT_PUBLIC_APP_NAME` – UI label for the app.
- `NEXT_PUBLIC_API_BASE_URL` – hypothetical backend base URL.
- `OPENAI_API_KEY` / `OPENAI_MODEL` – for a future `/ai/explain-risk` endpoint.

You can copy it and create a real `.env` if you later add these integrations.

---

## Key Components & Logic

- **`app/page.tsx`**
  - Defines the `DataCategory`, `ConsentLevel`, and data models.
  - Contains:
    - `computeRiskScore(rules)` – rule-based risk engine.
    - `summarizeRisk(score)` – maps numeric scores to human-readable strings.
    - Local state for:
      - Partner templates
      - Draft rules
      - Persisted consents
    - A responsive layout that:
      - Lets you design a partner contract.
      - Shows live metrics and a partner table.

- **`app/globals.css`**
  - Implements the visual identity: dark, high-contrast dashboard with pills, badges, and metrics.
  - Builds a layout that would translate well to a multi-page application.

---

## Impact & Metrics

Even as a frontend-only demo, we can reason about impact and behavior:

- **Performance**:
  - Pure client-side rendering, no network calls.
  - State updates are O(number of rules) and feel instantaneous for realistic app sizes.
  - Risk computation is deterministic and very fast.

- **Scalability**:
  - Data model easily maps to relational tables for multi-tenant SaaS.
  - The risk engine can be swapped for:
    - A more complex ruleset.
    - Or an LLM-backed evaluator with caching.

- **User Experience**:
  - Minimal clicks to understand what each partner sees.
  - Visual risk cues and descriptive text instead of raw numbers only.

---

## What’s Next

If this were to be taken closer to a production system, the next steps would be:

- **Backend & Auth**
  - Add Next.js API routes or a dedicated Node service.
  - Persist users, partners, and consents in Postgres (e.g., via Prisma).
  - Implement authentication and per-user isolation.

- **Audit Logs & Policies**
  - Track every consent change in an `AuditLog` table.
  - Attach policy IDs / regulation references (GDPR, DPDP Act, etc.).

- **LLM & Guardrails**
  - Use an LLM to:
    - Generate richer risk narratives.
    - Suggest safer consent presets.
  - Apply strict prompt templates and guardrails (no PII leakage or unsafe suggestions).

- **Real Integrations**
  - Sync with real third-party APIs (ads, analytics, loyalty, etc.).
  - Continuously check drift between configured vs. effective consent.

These directions align with the broader mission of putting users back in control of how their data is shared and monetized.


