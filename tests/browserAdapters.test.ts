/**
 * [INPUT]: 依赖 browser/appStorage、browser/moralRecorder 与 classroomBackup 工厂。
 * [OUTPUT]: 提供浏览器本地来源和 WebM 转 WAV 的 Vitest 回归。
 * [POS]: tests 根级浏览器 Adapter 契约测试，不启动真实浏览器或外部 Provider。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classroomBackupSourceStorageKey,
  getInitialClassroomBackup,
  getInitialClassroomSource,
  preferLocalClassroomBackup,
  saveClassroomBackupToStorage,
} from "../src/browser/appStorage";
import { getMoralRecorderSettings, prepareMoralAudioForTranscription } from "../src/browser/moralRecorder";
import { createClassroomBackup } from "../src/domain/classroomBackup";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function makeBackup() {
  return createClassroomBackup({
    children: [{ id: "child-a", name: "安安", spiritId: "01", petName: "小浪花", voiceType: 101016, slotId: 1 }],
    ledger: [],
    moralReviews: [],
    shopRedemptions: [],
    lotteryDraws: [],
    teacherMode: true,
    settingsChanges: [],
    organization: { activeCurriculumByClassroomId: {}, parentReportReviewsByChildId: {} },
  });
}

function readAscii(view: DataView, offset: number, length: number) {
  return Array.from({ length }, (_, index) => String.fromCharCode(view.getUint8(offset + index))).join("");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("classroom browser storage", () => {
  it("keeps an explicitly restored local backup authoritative across startup", () => {
    const localStorage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage });
    const backup = makeBackup();

    saveClassroomBackupToStorage(backup);
    preferLocalClassroomBackup();
    const reloadedBackup = getInitialClassroomBackup();

    expect(localStorage.getItem(classroomBackupSourceStorageKey)).toBe("local");
    expect(reloadedBackup?.children[0]?.id).toBe("child-a");
    expect(getInitialClassroomSource(reloadedBackup)).toBe("local");
  });

  it("falls back to server startup when the preferred local backup is unavailable", () => {
    const localStorage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage });
    preferLocalClassroomBackup();

    expect(getInitialClassroomSource(null)).toBe("server");
  });
});

describe("moral recorder provider compatibility", () => {
  it("prefers a Tencent-compatible native recording format", () => {
    vi.stubGlobal("MediaRecorder", { isTypeSupported: () => true });

    expect(getMoralRecorderSettings()).toEqual({ mimeType: "audio/mp4", voiceFormat: "m4a" });
  });

  it("transcodes a WebM fallback to mono 16 kHz PCM WAV", async () => {
    const channel = Float32Array.from({ length: 4_800 }, (_, index) => Math.sin(index / 20));
    class FakeAudioContext {
      async decodeAudioData() {
        return {
          length: channel.length,
          numberOfChannels: 2,
          sampleRate: 48_000,
          getChannelData: () => channel,
        } as unknown as AudioBuffer;
      }

      async close() {}
    }
    vi.stubGlobal("window", { AudioContext: FakeAudioContext });

    const prepared = await prepareMoralAudioForTranscription(new Blob(["webm"], { type: "audio/webm" }), "webm");
    const view = new DataView(await prepared.blob.arrayBuffer());

    expect(prepared.voiceFormat).toBe("wav");
    expect(prepared.blob.type).toBe("audio/wav");
    expect(readAscii(view, 0, 4)).toBe("RIFF");
    expect(readAscii(view, 8, 4)).toBe("WAVE");
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint16(34, true)).toBe(16);
  });
});
