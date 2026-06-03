# Provider Runtime Guide

Date: 2026-06-02

This guide documents the runtime provider configuration for the P2 child self-service moral flow and the P3 provider stability layer.

## Runtime Flow

The home-map self-service flow is:

```text
click spirit -> focus home -> browser microphone -> MediaRecorder audio blob
-> /api/speech/transcribe -> /api/agent/moral-evaluate
-> teacher review card -> /api/ledger with reviewId
-> XP ledger + moral review marked approved -> map feedback
```

The browser records with the first supported format from:

- `audio/webm;codecs=opus`
- `audio/webm`
- `audio/mp4`
- `audio/mpeg`

The frontend sends base64 audio and a `voiceFormat` hint to `/api/speech/transcribe`.

## Required Commands

Baseline validation:

```bash
npm run typecheck
npm test
npm run build
npm run qa:visual
```

Provider chain validation with real Tencent and DeepSeek credentials:

```bash
npm run qa:p4-providers
```

`npm run qa:visual` does not require a microphone. It uses a QA-only hook to exercise the review UI consistently in CI.

## DeepSeek Configuration

Enable DeepSeek by setting:

```bash
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=...
```

Optional:

```bash
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_TIMEOUT_MS=12000
PROVIDER_TIMEOUT_MS=12000
```

Fallback behavior:

- If `LLM_PROVIDER` is not `deepseek`, the server uses local moral rules.
- If `DEEPSEEK_API_KEY` is missing, the server uses local moral rules.
- If DeepSeek times out, returns non-JSON, or returns an upstream error, `/api/agent/moral-evaluate` still returns a local-rule result with `provider: "rules"` and a redacted `providerError`.
- Successful DeepSeek responses include `provider: "deepseek"`, `model`, and any returned `usage` object.

Mock LLM mode:

```bash
LLM_PROVIDER=mock
```

This returns the local-rule result with `provider: "mock"` and is intended for local provider-path tests.

## Tencent Speech Configuration

Shared Tencent credentials:

```bash
TENCENT_SECRET_ID=...
TENCENT_SECRET_KEY=...
```

Or split credentials:

```bash
TENCENT_TTS_SECRET_ID=...
TENCENT_TTS_SECRET_KEY=...
TENCENT_ASR_SECRET_ID=...
TENCENT_ASR_SECRET_KEY=...
```

Optional ASR settings:

```bash
TENCENT_ASR_REGION=ap-guangzhou
TENCENT_ASR_ENGINE=16k_zh
TENCENT_TIMEOUT_MS=12000
PROVIDER_TIMEOUT_MS=12000
```

Speech behavior:

- `/api/speech/speak` returns structured `503` JSON if Tencent TTS credentials are missing or Tencent fails.
- `/api/speech/transcribe` returns structured `503` JSON if Tencent ASR credentials are missing or Tencent fails.
- Tencent provider errors are redacted before returning to the client.
- Audio payloads larger than the Tencent ASR 3 MB limit are rejected server-side.

Mock speech mode:

```bash
SPEECH_PROVIDER=mock
MOCK_ASR_TEXT=我今天主动帮同学收玩具
```

This makes:

- `/api/speech/speak` return deterministic mock base64 audio.
- `/api/speech/transcribe` return `MOCK_ASR_TEXT`.

Use mock mode for no-credential local testing and fake-microphone browser smoke checks.

## Local Smoke With Fake Microphone

Start the dev server with mock ASR:

```bash
SPEECH_PROVIDER=mock MOCK_ASR_TEXT=我今天主动帮同学收玩具 npm run dev
```

Then run a Playwright/Chromium check with fake media devices:

```bash
node --input-type=module <<'EOF'
import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.grantPermissions(["microphone"], { origin: "http://127.0.0.1:5173" });
const page = await context.newPage();
await page.goto("http://127.0.0.1:5173/?module=home&qa=mic-smoke", { waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle");
await page.waitForFunction(() => typeof window.__growthIslandPrepareMoralSpeakForQa === "function");
await page.evaluate(() => window.__growthIslandPrepareMoralSpeakForQa("child-01"));
await page.locator(".moral-mic-button").click();
await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "listening");
await page.waitForTimeout(900);
await page.locator(".moral-wave-state").click();
await page.waitForFunction(() => window.__growthIslandMoralSpeakStage === "pendingReview");
console.log(await page.evaluate(() => window.__growthIslandMoralSpeak?.transcript));
await browser.close();
EOF
```

Expected output includes the mock transcript and the page reaches `pendingReview`.

## Review And Safety Notes

- Do not expose Tencent or DeepSeek secrets in logs, screenshots, or QA artifacts.
- Do not treat `npm run qa:visual` as proof that real ASR works; it verifies the UI flow.
- Treat `npm run qa:p4-providers` as proof that the configured provider chain is working in the current environment.
- For physical classroom deployment, verify the whiteboard browser can grant microphone permission and that Tencent ASR accepts the browser's recorded format.
