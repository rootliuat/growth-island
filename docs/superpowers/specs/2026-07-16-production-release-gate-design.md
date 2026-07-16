# Production Release Gate Design

## Goal

Turn the existing physical-microphone check into a production-equivalent classroom release gate. A release is judged on the target whiteboard through the deployed HTTPS origin, not on a developer GPU or simulated Provider path.

## Deployment boundary

The first online topology remains deliberately small: one Vite production build behind Nginx, one Node API process, and one persistent classroom data directory. Nginx terminates TLS, protects the classroom with HTTP authentication, serves static assets, and proxies same-origin `/api` requests to a loopback-only Node listener. The API stays single-process because its transaction queue and file snapshots are process-local; multi-instance deployment is forbidden until persistence moves to a shared transactional store.

The browser API Adapter uses same-origin `/api` by default. Local Vite development and preview proxy that path to port 5174. A separately hosted API remains possible only through an explicit build-time `VITE_API_BASE_URL`.

## Physical release evidence

`qa:real-mic` runs against a local production preview by default or an explicit `REAL_MIC_BASE_URL` staging origin. Non-loopback targets must use HTTPS. The report records only coarse device/runtime facts, navigation timing, render metrics, audio format/byte/timing diagnostics, retry counts, Provider names, and ledger counts; it never stores audio, credentials, or full transcripts.

The gate requires:

- Tencent ASR is configured and active; mock speech can never pass.
- The browser is a secure context and can complete real microphone capture.
- Wheel zoom and pointer drag each sustain at least 45 FPS at render resolution 1 or greater.
- Three-child calibration completes 3/3; the ten-child run completes 10/10 with at least nine first-pass recognitions.
- Every accepted attempt has an ASR duration at or below 12 seconds.
- Accepted attempts belong to distinct children and each child receives exactly one new approved dialogue ledger record.

Software-rendered CI remains useful for deterministic function, clarity, and relative regressions, but cannot certify the physical 45 FPS gate.

## Failure policy

A failed gate still writes the detailed redacted report before exiting non-zero. Services and the headed browser are always closed. Local runs use an isolated QA database; staging runs never reset remote data and count only records created after the run starts.

## Verification

- Pure release-gate tests cover insecure targets, mock Provider rejection, FPS/resolution failure, duplicate children, duplicate ledger records, and a passing ten-child run.
- Full Vitest, production build, production preview smoke, and trial browser QA stay green.
- The real 3+10 physical run remains intentionally manual and is the only step that can declare classroom release readiness.
