# Server Deep Modules Design

## Goal

Split the oversized local server into two deep Modules while preserving every observable behaviour. The refactor must not add or remove HTTP routes, environment variables, response fields, status codes, database fields, provider fallbacks, or timing guarantees.

This specification covers only the server. The frontend `App.tsx` split is a separate future design.

## Current friction

`server/beihai-api.mjs` currently owns five concerns: JSON persistence, transaction ordering, classroom mutation rules, external Provider implementations, and HTTP routing. Understanding one concurrency rule requires reading almost the whole file, and tests can protect the behaviour only through the process-level HTTP seam.

The desired architecture creates Locality around two existing domain responsibilities:

- **Classroom data transactions** turn one current classroom snapshot into the next without partial or stale writes.
- **Classroom Providers** turn text or audio into external speech and moral-evaluation results without exposing signing, timeout, mock, or fallback details.

## Target structure

```text
server/
├── beihai-api.mjs              # HTTP parsing, route dispatch, error mapping, process startup
├── classroom-store.mjs         # classroom snapshot persistence and all classroom data transactions
├── classroom-providers.mjs     # Tencent speech and DeepSeek/rules Provider implementation
├── moral-agent.mjs             # deterministic local moral rule engine
└── CLAUDE.md                   # server module map
```

Every source file remains below 800 lines. No extra directory is needed because the server layer remains below the repository's eight-file limit.

## Classroom store Module

`classroom-store.mjs` owns:

- default classroom snapshot creation and schema normalization;
- JSON reads, atomic temporary-file writes, and rename commits;
- the process-local transaction queue and its failure recovery;
- XP floor, ledger defaults, review linkage, undo, child profile, and review status rules;
- the canonical snapshot projection returned to HTTP callers.

Its Interface exposes domain operations rather than a mutable database object:

- read the current classroom snapshot or one child profile;
- validate the participants of a moral evaluation;
- patch a child profile;
- create or undo a growth ledger record;
- append, approve, or reject a moral review.

Callers never receive a transaction callback and never write a database object. Invalid operations throw an internal error carrying the same HTTP status and message currently emitted by the server.

The child voice profile catalog is persisted classroom data, so its normalization helpers remain owned by the store Interface. The Provider Module may consume the normalized voice profile but cannot mutate it.

## Classroom Providers Module

`classroom-providers.mjs` owns:

- timeout normalization and redacted Provider errors;
- Tencent Cloud v3 signing and request transport;
- mock/Tencent TTS and ASR behaviour, payload limits, formats, voice labels, and response normalization;
- DeepSeek request construction, JSON extraction, result normalization, and deterministic rule fallback.

Its Interface exposes three operations: synthesize speech, transcribe speech, and evaluate a moral transcript. Returned values retain the current provider/model/usage metadata. Provider waits never open or retain a classroom data transaction.

## HTTP entry Module

`beihai-api.mjs` owns only:

- `.env` loading and construction of the two deep Modules;
- request-body limits and JSON parsing;
- CORS, route matching, response serialization, and process startup;
- mapping internal store and Provider errors to the existing status codes.

For moral evaluation, the entry performs the existing sequence explicitly:

1. validate child and operator through the store;
2. evaluate through the Provider Module without a transaction;
3. append the review through a fresh store transaction;
4. return the unchanged response shape.

## Compatibility and error behaviour

- Database path, port, Provider credentials, engine names, regions, timeouts, and mock variables keep their existing names and defaults.
- Existing JSON files migrate and persist exactly as before.
- Existing 400, 404, 409, 502, 503, and 500 paths retain their messages and response bodies.
- A failed transaction releases the queue so later reads and writes continue.
- Atomic rename behaviour and the single-process storage assumption remain unchanged.
- Provider failures retain current redaction and rules fallback semantics.

## Verification

1. Run the existing server business and Provider stability suites before and after extraction.
2. Keep the paused-DeepSeek regression proving that an intervening ledger write survives review creation.
3. Add direct store Interface tests using a temporary database:
   - a valid mutation persists and returns the expected snapshot;
   - an invalid mutation rejects with the current status/message;
   - a valid transaction after that rejection succeeds, proving queue recovery.
4. Run the full `npm test` suite and `npm run build`.
5. Compare route names, environment-variable reads, response construction, and default database shape before and after the move.

## Non-goals

- No frontend refactor.
- No HTTP framework, database engine, worker, process lock, or dependency injection framework.
- No new Provider adapter or speculative seam.
- No changes to moral scoring, voice choices, backup behaviour, P2 review findings, or public types.
