# 4-Door Platform Redesign

This folder contains the design artefacts for the SuperAdPro 4-door navigation
redesign. It is the source of truth for the redesign work; any implementation
that conflicts with these documents should raise the conflict before proceeding.

## Files

- **SuperAdPro-4-Door-Redesign-Spec.docx** — the locked design specification.
  Covers the 4-door model, colour system, page structure, sidebar behaviour,
  and phased rollout plan. Read this first.

- **SuperAdPro-Route-Audit.docx** — analysis of all 287 GET routes in
  `app/main.py`, classified by category. Explains which routes redirect,
  which stay unchanged, and flags collisions (e.g. `/tools`).

- **SuperAdPro-Route-Audit.csv** — the same audit as a spreadsheet. Sortable
  by category, filterable by action. Open in Excel/Numbers/Google Sheets.

- **superadpro-platform-mockup.html** — static HTML mockup showing the
  three key states (landing → Income overview → Campaign Grid stream).
  Open in a browser for visual reference while building.

## Current status

- **Phase 1 — in progress.** Preview page at `/new/landing` serves the
  4-door landing for design review. Nothing member-facing has changed yet.

- **Decisions locked:** see `SuperAdPro-4-Door-Redesign-Spec.docx` §9.
  `/launch-wizard` and `/vip` are scrapped; `/tools` uses the
  same-URL-different-content pattern (public marketing for guests,
  member Tools door for logged-in users).

## How to preview

Log in, navigate to `https://superadpro.com/new/landing`. The page renders
inside the existing `AppLayout` (current sidebar and topbar) for Phase 1;
the filtered sidebar arrives in Phase 2.
