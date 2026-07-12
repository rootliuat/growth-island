/**
 * [INPUT]: 依赖浏览器 MediaRecorder 与 FileReader。
 * [OUTPUT]: 对外提供腾讯兼容录音格式选择、WebM 转 WAV 和 Blob base64 转换 Adapter。
 * [POS]: browser 的麦克风录音 Adapter，被 App 的说成长流程消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export function getMoralRecorderSettings() {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    { mimeType: "audio/mp4", voiceFormat: "m4a" },
    { mimeType: "audio/mpeg", voiceFormat: "mp3" },
    { mimeType: "audio/ogg;codecs=opus", voiceFormat: "ogg-opus" },
    { mimeType: "audio/webm;codecs=opus", voiceFormat: "webm" },
    { mimeType: "audio/webm", voiceFormat: "webm" },
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)) ?? { mimeType: "", voiceFormat: "webm" };
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function writeWavHeader(view: DataView, sampleCount: number, sampleRate: number) {
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(view, 8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, sampleCount * 2, true);
}

function resampleToMono(buffer: AudioBuffer, targetSampleRate: number) {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  const sampleCount = Math.max(1, Math.round((buffer.length * targetSampleRate) / buffer.sampleRate));
  return Float32Array.from({ length: sampleCount }, (_, index) => {
    const sourcePosition = (index * buffer.sampleRate) / targetSampleRate;
    const before = Math.min(buffer.length - 1, Math.floor(sourcePosition));
    const after = Math.min(buffer.length - 1, before + 1);
    const ratio = sourcePosition - before;
    const mixed = channels.reduce((sum, channel) => sum + channel[before] + (channel[after] - channel[before]) * ratio, 0);
    return mixed / channels.length;
  });
}

function encodePcmWav(samples: Float32Array, sampleRate: number) {
  const wav = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(wav);
  writeWavHeader(view, samples.length, sampleRate);
  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  return new Blob([wav], { type: "audio/wav" });
}

async function transcodeWebmToWav(blob: Blob) {
  type AudioContextConstructor = new () => AudioContext;
  const audioWindow = window as typeof window & { webkitAudioContext?: AudioContextConstructor };
  const AudioContextClass = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioContextClass) throw new Error("Audio decoding is not supported");
  const context = new AudioContextClass();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    return encodePcmWav(resampleToMono(decoded, 16_000), 16_000);
  } finally {
    await context.close();
  }
}

export async function prepareMoralAudioForTranscription(blob: Blob, voiceFormat: string) {
  if (voiceFormat !== "webm") return { blob, voiceFormat };
  return { blob: await transcodeWebmToWav(blob), voiceFormat: "wav" };
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
