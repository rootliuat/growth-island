# Energy Constellation Batch 2 VFX Review

Date: 2026-06-04

Scope: four small reusable VFX sprites for the child self-service moral-growth loop.

## Verdict

Keep this batch accepted. Do not generate a full constellation background.

The final set is suitable for short, low-clutter feedback on the Growth Island home map:

- teacher approval success
- energy travel cue
- current child touch / speak-growth focus
- next child marker

## Accepted Assets

| Asset | Runtime Size | Status | Use Rule |
|---|---:|---|---|
| `energy-confirm-burst.png` | `256x256` | Accepted | Use for `500-700ms` after teacher approval. Keep modestly scaled so it does not cover child names. |
| `energy-arrival-orb.png` | `128x128` | Accepted | Use as a traveling energy bead from teacher confirmation toward the current spirit, growth tree, or active slot. |
| `energy-touch-halo.png` | `256x256` | Accepted | Use behind the current child target or speak-growth mic. Keep it behind labels and avatars. |
| `next-child-halo.png` | `256x256` | Accepted | Use briefly after success to mark the next child. Do not leave it as idle clutter. |

## Rejected Candidates

| Asset | Reason |
|---|---|
| `energy-confirm-burst.png` candidate 1 | Too much like a large shell badge; would obscure the child-facing map feedback. |
| `energy-confirm-burst.png` candidate 2 | Too green and plant-like for a gold/coral confirmation burst. |

## Technical Acceptance

- Source files normalized to `1254x1254` chroma-key PNG under `source/`.
- Final generated files are `1254x1254` transparent RGBA PNG.
- Runtime files are under `public/assets/ui/energy-constellation/`.
- All accepted final and runtime PNGs have alpha channels.
- All accepted final and runtime PNG corner alpha values are `0`.
- Estimated key-color residue after high-res and runtime cleanup is `0`.

## Files

```text
assets/generated/ui/energy-constellation/energy-vfx-batch2.manifest.json
assets/generated/ui/energy-constellation/energy-vfx-batch2-qa.png
assets/generated/ui/energy-constellation/energy-confirm-burst.png
assets/generated/ui/energy-constellation/energy-arrival-orb.png
assets/generated/ui/energy-constellation/energy-touch-halo.png
assets/generated/ui/energy-constellation/next-child-halo.png
public/assets/ui/energy-constellation/energy-confirm-burst.png
public/assets/ui/energy-constellation/energy-arrival-orb.png
public/assets/ui/energy-constellation/energy-touch-halo.png
public/assets/ui/energy-constellation/next-child-halo.png
```

## Frontend Integration Notes

- Prefer CSS/React overlay timing first; do not rewrite PixiJS map layers for this batch.
- Respect `prefers-reduced-motion`.
- Use `pointer-events: none` for VFX overlays.
- Do not add persistent decorative loops to the home map.
- Verify against `home-whiteboard.png`, focused child state, teacher approval state, and `mobile-home-mobile.png`.
