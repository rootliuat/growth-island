# Trial Classroom Stability Design

## Goal

Move Growth Island from deterministic prototype QA to a real Windows whiteboard release gate. Delivery stays in four sequential slices: physical speech, loading and interaction performance, snapshot recovery, and a non-blocking classroom QA workflow.

## Speech gate

Speech failures use stable codes. Permission, device, empty recording, decode, rejection, timeout, upstream, and network failures remain distinct. Retryable recognition failures keep one prepared audio payload in memory for one teacher-triggered retranscription; every other failure requires a new recording. Audio and full transcripts never enter diagnostics.

Provider health reports only provider names and configuration readiness. A headed `qa:real-mic` run captures format, byte, latency, retry, outcome, and ledger totals. Release requires 3/3 calibration followed by 10/10 completion, at least 9 first-pass recognitions, no ASR request over 12 seconds, and exactly one approved ledger record per child.

## Later slices

Performance work will lazy-load non-home and Three.js code, keep thumbnails on list surfaces, and simplify Pixi layers during gestures. Recovery work will retain 20 validated snapshots, restore the newest valid snapshot after corruption, and preserve browser-local authority after write failure. Classroom QA will run separately from required CI on a schedule and manual dispatch, always uploading evidence without using Provider secrets.

## Compatibility

API health and error responses grow additively. Existing backup schema, navigation, ledger reason text, Provider fallback behavior, and required `validate` CI remain compatible. The runtime remains one local Node process; no database, account, or cloud synchronization is introduced.

## Verification

Each slice keeps full Vitest, TypeScript build, trial browser QA, and production preview smoke green. Physical speech evidence is required in addition to mock and Provider API smoke reports; simulated microphone hooks cannot satisfy the release gate.
