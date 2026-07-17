/**
 * [INPUT]: 依赖真实麦克风尝试、目标设备地图性能、Provider health 与新增课堂 ledger。
 * [OUTPUT]: 对外提供安全目标 URL、45 FPS/清晰度判定和 3+10 人发布验收纯函数。
 * [POS]: scripts/qa 的生产发布规则核心，被 qa-real-mic 与 Vitest 消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const releaseMinimumInteractionFps = 45;
export const releaseMinimumRenderResolution = 0.99;
export const releaseMaximumAsrMs = 12_000;

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const acceptedVoiceFormats = new Set(["wav", "m4a", "mp3", "ogg-opus"]);

export function normalizeReleaseTarget(value, label = "release target") {
  const url = new URL(value);
  if (url.username || url.password) throw new Error(`${label} must not contain credentials`);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopbackHosts.has(url.hostname))) {
    throw new Error(`${label} must use HTTPS unless it is loopback`);
  }
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function collectResolutionFailures(label, sample, failures) {
  for (const [stateLabel, state] of [
    ["active", sample?.renderState],
    ["settled", sample?.settledRenderState],
  ]) {
    const resolution = state?.renderResolution;
    if (!finiteNumber(resolution) || resolution < releaseMinimumRenderResolution) {
      failures.push(`${label} ${stateLabel} render resolution must stay at 1 or greater`);
    }
    for (const axis of ["backingRatioX", "backingRatioY"]) {
      const ratio = state?.[axis];
      if (!finiteNumber(ratio) || ratio < releaseMinimumRenderResolution) {
        failures.push(`${label} ${stateLabel} ${axis} must stay at 1 or greater`);
      }
    }
  }
}

export function evaluateMapPerformance(performance) {
  const failures = [];
  const fpsValues = [];
  for (const [label, sample] of [
    ["wheel", performance?.wheelFps],
    ["drag", performance?.dragFps],
  ]) {
    if (!finiteNumber(sample?.fps)) failures.push(`${label} FPS measurement is missing`);
    else {
      fpsValues.push(sample.fps);
      if (sample.fps < releaseMinimumInteractionFps) {
        failures.push(`${label} FPS ${sample.fps} is below ${releaseMinimumInteractionFps}`);
      }
    }
    collectResolutionFailures(label, sample, failures);
  }

  return {
    ok: failures.length === 0,
    minimumFps: fpsValues.length ? Math.min(...fpsValues) : undefined,
    wheelFps: performance?.wheelFps?.fps,
    dragFps: performance?.dragFps?.fps,
    failures,
  };
}

function countByChild(records) {
  const counts = new Map();
  for (const record of records) counts.set(record.childId, (counts.get(record.childId) ?? 0) + 1);
  return counts;
}

export function evaluateRealMicAcceptance({ targetCount, attempts, ledgerRecords, providers, runtime, performance }) {
  const approved = attempts.filter((attempt) => attempt.outcome === "approved").slice(-targetCount);
  const childIds = approved.map((attempt) => attempt.childId);
  const uniqueChildIds = new Set(childIds);
  const ledgerCounts = countByChild(ledgerRecords);
  const asrTimes = approved.map((attempt) => attempt.asrMs);
  const firstPassCount = approved.filter((attempt) => attempt.retryCount === 0).length;
  const map = evaluateMapPerformance(performance);
  const failures = [...map.failures];

  if (providers?.speech?.name !== "tencent" || !providers?.speech?.configured) {
    failures.push("Tencent ASR must be configured and active");
  }
  if (!runtime?.isSecureContext) failures.push("browser must run in a secure context");
  if (!runtime?.expectedOrigin || runtime.origin !== runtime.expectedOrigin) failures.push("browser must stay on the configured release origin");
  if (runtime?.microphonePermissionAfter !== "granted") failures.push("microphone permission must be granted by the target browser");
  if (approved.length !== targetCount) failures.push(`approved attempts ${approved.length}/${targetCount}`);
  if (uniqueChildIds.size !== targetCount) failures.push(`approved children ${uniqueChildIds.size}/${targetCount}`);
  if (ledgerRecords.length !== targetCount) failures.push(`new approved ledger records ${ledgerRecords.length}/${targetCount}`);
  if (childIds.some((childId) => ledgerCounts.get(childId) !== 1)) {
    failures.push("each approved child must receive exactly one new ledger record");
  }
  if (asrTimes.some((duration) => !finiteNumber(duration) || duration < 0 || duration > releaseMaximumAsrMs)) {
    failures.push(`every ASR duration must be present and at most ${releaseMaximumAsrMs}ms`);
  }
  if (targetCount >= 10 && firstPassCount < 9) failures.push(`first-pass recognitions ${firstPassCount}/10`);
  if (approved.some((attempt) => !acceptedVoiceFormats.has(attempt.preparedVoiceFormat))) {
    failures.push("every approved recording must use a Tencent-compatible prepared format");
  }
  if (approved.some((attempt) => attempt.sourceVoiceFormat === "webm" && attempt.preparedVoiceFormat !== "wav")) {
    failures.push("WebM recordings must be converted to WAV before ASR");
  }

  return {
    ok: failures.length === 0,
    failures,
    approved,
    map,
    summary: {
      approvedCount: approved.length,
      distinctChildCount: uniqueChildIds.size,
      firstPassCount,
      ledgerCount: ledgerRecords.length,
      medianAsrMs: median(asrTimes.filter(finiteNumber)),
      maxAsrMs: asrTimes.filter(finiteNumber).length ? Math.max(...asrTimes.filter(finiteNumber)) : undefined,
    },
  };
}

function median(values) {
  if (!values.length) return undefined;
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
