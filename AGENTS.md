# Agent Guide

## Design authority (read before any UI, styling, or copy work)

Several installed design skills overlap and contradict each other. They resolve
by **layer**. Only one skill owns a layer at a time. When two skills disagree,
the higher layer wins and the lower layer adapts.

| Layer | Owner | Job |
|---|---|---|
| 1. Diagnose | `redesign-existing-projects` | Audit the existing UI, report findings, fix in place. Never redesign from zero. |
| 2. Values | `landing-page-design` | Fonts, type scale, spacing scale, radius, palette, motion curve, copy rules. **Single source of numeric truth.** |
| 3. Tokens | `theme-factory` | Turn layer 2 values into CSS variables. Mechanism only, never new values. |
| 4. Direction | `frontend-design-direction` | Product/domain judgment: what this UI should feel like. |
| 5. Execution | `react-patterns`, `nextjs-turbopack`, `motion-*` | How to build it in Next.js. |
| 6. Polish | `make-interfaces-feel-better` | Micro-detail pass, constrained to layer 2 tokens. |
| 7. Verify | `webapp-testing`, `browser-qa` | Screenshot and console-check the running app. |

### Hard rules

- Do not load `frontend-design` or `impeccable` for the same task as
  `landing-page-design`. They contradict it on font pairing, pure black, and
  marketing-page visuals. `landing-page-design` wins in this repo.
- `design-system` and `redesign-existing-projects` both audit. Run
  `redesign-existing-projects` first; use `design-system` only to extract tokens
  into `design-tokens.json`.
- `theme-factory` may not invent values. If a value is missing from
  `landing-page-design` Part B, add it there first, then tokenize. Never inline.
- `motion-foundations` spring presets are for app UI only. Marketing pages and
  scroll reveals use the layer 2 curve.

### Known conflicts to resolve in this repo

- Icons: `landing-page-design` allows Phosphor, Solar, Iconamoon only. This repo
  ships `lucide-react`. Decide once: keep `lucide-react` and record the exception
  here, or migrate.
- `react-three-fiber` hero visuals: `landing-page-design` forbids 3D-style
  marketing illustration. Treat the 3D scene as product UI, not marketing.
- Backgrounds: no gradients except the hero heading text gradient.

### Workflow

1. `redesign-existing-projects` → diagnosis report. Stop and get approval.
2. Apply fixes in its priority order: fonts, color, states, layout, motion.
3. Verify at 390px + desktop with `webapp-testing` before claiming done.

> Skills installed via `npx skills` live in `.agents/skills/` and `.claude/skills/`.
> `npx skills update` overwrites local edits. Keep project decisions here, not in
> skill files.
