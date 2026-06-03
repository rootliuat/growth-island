import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve("qa-artifacts/latest");
const reportPath = path.join(outputDir, "p4-provider-smoke.json");
const port = Number(process.env.P4_API_PORT || 5184);
const baseUrl = `http://127.0.0.1:${port}`;
const dbPath = path.join(outputDir, "p4-provider-db.json");
const sampleText = process.env.P4_SAMPLE_TEXT || "我今天主动帮同学收玩具";

function redact(text) {
  let value = String(text || "");
  for (const secretName of [
    "TENCENT_SECRET_ID",
    "TENCENT_SECRET_KEY",
    "TENCENT_TTS_SECRET_ID",
    "TENCENT_TTS_SECRET_KEY",
    "TENCENT_ASR_SECRET_ID",
    "TENCENT_ASR_SECRET_KEY",
    "DEEPSEEK_API_KEY",
  ]) {
    const secret = process.env[secretName];
    if (secret && secret.length > 6) value = value.split(secret).join("<redacted>");
  }
  return value;
}

async function waitForHealth() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for P4 API server");
}

async function postJson(route, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`${route} failed ${response.status}: ${message}`);
  }
  return response.json();
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.rmSync(dbPath, { force: true });

  const server = spawn(process.execPath, ["server/beihai-api.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      BEIHAI_DB_PATH: dbPath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverOutput = "";
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });

  try {
    await waitForHealth();

    const firstSpeech = await postJson("/api/speech/speak", {
      childId: "child-01",
      text: sampleText,
    });
    const asr = await postJson("/api/speech/transcribe", {
      audioBase64: firstSpeech.audioBase64,
      voiceFormat: firstSpeech.codec || "mp3",
    });
    const moral = await postJson("/api/agent/moral-evaluate", {
      childId: "child-01",
      operatorChildId: "child-01",
      transcript: asr.text,
    });
    const replyText = moral.result?.reasonForChild || "精灵收到了新的成长能量。";
    const replySpeech = await postJson("/api/speech/speak", {
      childId: "child-01",
      text: replyText,
    });

    const report = {
      generatedAt: new Date().toISOString(),
      ok: Boolean(
        firstSpeech.provider === "tencent" &&
          asr.provider === "tencent" &&
          moral.provider === "deepseek" &&
          moral.result?.category &&
          moral.result?.xpDelta !== undefined &&
          replySpeech.provider === "tencent" &&
          replySpeech.audioBase64,
      ),
      providers: {
        tts: firstSpeech.provider,
        asr: asr.provider,
        llm: moral.provider,
      },
      models: {
        llm: moral.model,
        asr: asr.engineModel,
      },
      input: {
        sampleText,
        transcript: asr.text,
        transcriptContainsSampleKeyword: ["帮助", "同学", "收玩具"].some((word) => asr.text.includes(word)),
      },
      result: {
        intent: moral.result?.intent,
        category: moral.result?.category,
        xpDelta: moral.result?.xpDelta,
        confidence: moral.result?.confidence,
        status: moral.result?.status,
      },
      tts: {
        firstVoiceType: firstSpeech.voiceType,
        firstVoiceLabel: firstSpeech.voiceLabel,
        firstAudioBytes: Buffer.byteLength(firstSpeech.audioBase64 || "", "base64"),
        replyVoiceType: replySpeech.voiceType,
        replyVoiceLabel: replySpeech.voiceLabel,
        replyAudioBytes: Buffer.byteLength(replySpeech.audioBase64 || "", "base64"),
      },
    };

    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`P4 provider smoke report: ${reportPath}`);
    console.log(
      JSON.stringify(
        {
          ok: report.ok,
          providers: report.providers,
          models: report.models,
          transcript: report.input.transcript,
          result: report.result,
          tts: {
            firstVoiceType: report.tts.firstVoiceType,
            firstVoiceLabel: report.tts.firstVoiceLabel,
            firstAudioBytes: report.tts.firstAudioBytes,
            replyVoiceType: report.tts.replyVoiceType,
            replyVoiceLabel: report.tts.replyVoiceLabel,
            replyAudioBytes: report.tts.replyAudioBytes,
          },
        },
        null,
        2,
      ),
    );

    if (!report.ok) {
      throw new Error("P4 provider chain did not return all required provider outputs");
    }
  } catch (error) {
    const message = redact(error instanceof Error ? error.message : String(error));
    const output = redact(serverOutput).slice(-2000);
    fs.writeFileSync(
      reportPath,
      `${JSON.stringify({ generatedAt: new Date().toISOString(), ok: false, error: message, serverOutput: output }, null, 2)}\n`,
      "utf8",
    );
    throw new Error(message);
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch((error) => {
  console.error(redact(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
