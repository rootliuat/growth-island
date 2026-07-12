# P1 Review Fixes Design

## Scope

Resolve only the three P1 review findings:

1. Moral evaluation must not overwrite database writes completed while the provider request is in flight.
2. Browser-recorded WebM audio must not be sent unchanged to Tencent SentenceRecognition.
3. A confirmed local backup restore or local clear must survive page reload when the API remains reachable.

The P2 correction, recurring-task, and analytics findings are explicitly out of scope.

## Database consistency

All database read-modify-write operations run through one process-local mutation queue. A mutation reads the newest database only after it owns the queue, validates against that state, applies its change, writes atomically, and then releases the queue even when it throws.

Moral provider evaluation remains outside the mutation queue because network latency must not block unrelated classroom writes. The endpoint performs cheap request validation before evaluation, then enters the mutation queue, re-reads the database, revalidates the child and operator, appends the review, and commits. This removes the stale snapshot without holding a lock across the provider await.

The queue is process-local by design. The current API is a single Node process writing one JSON file; cross-process locking is outside this prototype's runtime contract.

## Browser audio compatibility

Recorder selection prefers MediaRecorder outputs already accepted by Tencent: M4A, MP3, and OGG Opus. WebM Opus remains the compatibility fallback for Chromium-class browsers.

Before upload, a WebM blob is decoded through the browser audio stack, mixed to mono, resampled to 16 kHz, and encoded as signed 16-bit PCM WAV. The request then carries the converted bytes with `voiceFormat: "wav"`. Already-supported formats pass through unchanged.

Decode or conversion failure follows the existing microphone error path and never sends mislabeled WebM bytes. Recording remains capped at the existing 5.5 seconds, so in-browser conversion cost and payload size stay bounded.

## Local backup source persistence

Local storage gains a separate classroom-source preference with two meaningful states: absent means server-preferred startup; `local` means the saved classroom backup is authoritative.

Confirmed restore and clear operations save the resulting backup first, then persist the local preference, then apply React state. On startup, a valid local backup plus the local preference initializes offline mode and skips the server fetch. A missing or invalid local backup cannot activate local preference, so startup safely falls back to the server.

Ordinary online snapshot caching does not set local preference. This prevents a routine cached server response from accidentally pinning the app offline.

## Error handling and compatibility

- Database mutations propagate their original HTTP error and leave the mutation queue usable.
- Existing JSON data, API response shapes, and backup schema remain unchanged.
- Existing local backups continue to load; only explicit restore or clear selects them as authoritative across reloads.
- No new server endpoint or remote destructive operation is introduced.

## Verification

- Provider concurrency test: pause a valid DeepSeek response, create a ledger entry during the pause, release evaluation, and assert both the ledger entry and new review remain.
- Mutation queue regression: run overlapping ledger writes and assert neither is lost.
- Recorder tests: assert supported native formats are preferred and WebM conversion emits a valid mono 16 kHz PCM WAV header and `voiceFormat: "wav"`.
- Storage tests: assert explicit local preference requires a valid backup and survives a simulated reload; absent preference remains server-first.
- Run `npm test` and `npm run build`.

## Non-goals

- Multi-process database coordination or replacing JSON storage with a database.
- Server-side backup import/clear APIs.
- General audio transcoding beyond the short moral-growth recording flow.
- Any P2 review finding.
