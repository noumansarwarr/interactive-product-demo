# Changelog

## 0.1.0

First release. Extracted from a production Next.js marketing page running four of
these scenes.

- `SKILL.md` — the seven-step workflow, the five invariants, the ship gate.
- Four hooks: beat engine with pause/resume banking, activity gating, camera with
  target measurement and damped pan, typed-text reveal.
- `scene.css` — spotlight, cursor, press ripple, reduced-motion and narrow-viewport
  degradation.
- `scene-template.tsx` — a complete wired skeleton.
- Five references: architecture, replica reuse, authoring, pitfalls, checklist.

### Known gaps

- React only. The JS↔CSS contract is data attributes and custom properties, so a
  Vue/Svelte/vanilla port replaces scheduling only, but no port ships here yet.
- The blur half of the spotlight is opt-in. In production it was cut: two
  stage-sized `backdrop-filter` layers cost more than the vignette plus push-in
  were worth.
- No scroll-pinned variant. The scenes here are ambient loops gated on visibility;
  a scroll-driven scene (progress → step) is a documented pattern but not an asset.
