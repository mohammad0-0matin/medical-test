# Salamat Yar (سلامت یار)

Healthcare platform: Django (API) + React (SPA). It handles patient data, so data-safety rules outrank speed, visuals and convenience.

## Stack

- Backend: Django 5.0, DRF, PostgreSQL
- Frontend: React 18, Vite, Tailwind v4, shadcn/ui
- UI language: Persian (RTL) primary
- Digits: Latin digits (0-9) everywhere in the UI, including patient-facing text, inputs, lab values and medical codes
- Run backend: `python manage.py runserver` | Run frontend: `npm run dev`
- Tests / lint / format: `pytest` / `eslint .` / `prettier --write .`

## Rules and skills

- `.agents/rules/health-project-rules.md` is always on. Read it before any task that touches data, models, APIs or permissions.
- Skills live in `.agents/skills/`. Use them by task:

| Task | Read first |
|---|---|
| Models, serializers, views, APIs, queries | skill `django-mastery` |
| Any UI, styling, layout or component | `DESIGN.md`, then skill `shadcn-ui` |
| Animations, hover/press states, loaders | skill `motion` |

Read the files before you start, not after. If a task touches both backend and frontend, read both sets.

## Precedence when rules conflict

1. Patient data safety (`health-project-rules.md`) always wins.
2. `DESIGN.md` (project tokens, accessibility, RTL).
3. Skill `shadcn-ui`.
4. Skill `motion`.

Do not copy values from outside reference designs (Stripe, Linear, Apple, IBM, Vercel). `DESIGN.md` already says what we borrow from them.

## Correction to the health rules

The endpoint example in `health-project-rules.md` is `/api/patients/<uuid:pk>/`. UUIDs only hide record counts. The real protection is the object-level permission check (a doctor sees only their own patients). Never skip that check.

## How to work

1. **Audit before changing UI.** Run the app, screenshot each page (Playwright), and list the problems first. Ask before starting a large redesign.
2. **Small steps.** Change one page or component at a time and show what changed.
3. **Ask before adding a dependency** or changing the data model.
4. **Match existing patterns** in the codebase unless they violate a rule above.
5. **Never use real patient data** in tests, fixtures, screenshots or examples. Use English sample names and values.

## Definition of done

A task is done only when all of these are true:

- Tests and lint pass, and you ran them.
- UI: you opened the page and checked it at mobile (375px) and desktop widths, in light and dark mode, and in RTL.
- Contrast meets WCAG AA, everything works by keyboard, and focus is visible.
- Loading, empty, error and validation states exist.
- No patient data in URLs, localStorage, logs or error messages.
- No hardcoded colors. Semantic tokens only.
- You summarized what changed and anything you chose not to do.

## Don'ts

- Don't hard delete medical records. Use soft delete.
- Don't put queries inside loops.
- Don't expose sensitive fields (national ID, address, full history) in list endpoints.
- Don't load fonts or scripts from third-party CDNs. Self-host.
