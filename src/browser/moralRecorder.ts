/**
 * [INPUT]: 依赖浏览器 MediaRecorder 与 FileReader。
 * [OUTPUT]: 对外提供录音格式选择和 Blob base64 转换 Adapter。
 * [POS]: browser 的麦克风录音 Adapter，被 App 的说成长流程消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export function getMoralRecorderSettings() {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    { mimeType: "audio/webm;codecs=opus", voiceFormat: "webm" },
    { mimeType: "audio/webm", voiceFormat: "webm" },
    { mimeType: "audio/mp4", voiceFormat: "m4a" },
    { mimeType: "audio/mpeg", voiceFormat: "mp3" },
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)) ?? { mimeType: "", voiceFormat: "webm" };
}

export function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Audio read failed"));
    reader.readAsDataURL(blob);
  });
}
