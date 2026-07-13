# Trial Classroom Stability Design

## Goal

Move Growth Island from deterministic prototype QA to a real Windows whiteboard release gate. Delivery stays in four sequential slices: physical speech, loading and interaction performance, snapshot recovery, and a non-blocking classroom QA workflow.

## Speech gate

Speech failures use stable codes. Permission, device, empty recording, decode, rejection, timeout, upstream, and network failures remain distinct. Retryable recognition failures keep one prepared audio payload in memory for one teacher-triggered retranscription; every other failure requires a new recording. Audio and full transcripts never enter diagnostics.

Provider health reports only provider names and configuration readiness. A headed `qa:real-mic` run captures format, byte, latency, retry, outcome, and ledger totals. Release requires 3/3 calibration followed by 10/10 completion, at least 9 first-pass recognitions, no ASR request over 12 seconds, and exactly one approved ledger record per child.

## Later slices

Performance work will lazy-load non-home and Three.js code, keep thumbnails on list surfaces, and simplify Pixi layers during gestures. Recovery work will retain 20 validated snapshots, restore the newest valid snapshot after corruption, and preserve browser-local authority after write failure. Classroom QA will run separately from required CI on a schedule and manual dispatch, always uploading evidence without using Provider secrets.

Recovery snapshots carry a persistent monotonic revision; wall-clock time is diagnostic only and never decides which state is newest. Startup compares the valid main file and every valid snapshot, then restores the highest revision. Every non-idempotent classroom mutation requires a stable operation ID plus operation type and canonical client-request fingerprint, and retries once with the same ID, so a lost HTTP response cannot create a second ledger or review while reuse for a different request returns `409 idempotency_conflict`. Moral evaluation checks this identity before calling the Provider and excludes stochastic model output from the fingerprint. Only an explicit `classroom_degraded` response proves that a write did not start and permits immediate local fallback. An unresolved network or disk result pauses new writes as unavailable instead of manufacturing a second local operation. Once local or unavailable authority is established, late server responses cannot replace it.

Browser-local authority is one localStorage envelope containing source, revision, and the validated backup. The envelope is one-key atomic at the browser boundary; a failed replacement leaves the previous authoritative envelope intact.

## Compatibility

API health and error responses grow additively. Existing backup schema, navigation, ledger reason text, Provider fallback behavior, and required `validate` CI remain compatible. The runtime remains one local Node process; no database, account, or cloud synchronization is introduced.

## Verification

Each slice keeps full Vitest, TypeScript build, trial browser QA, and production preview smoke green. Physical speech evidence is required in addition to mock and Provider API smoke reports; simulated microphone hooks cannot satisfy the release gate.
