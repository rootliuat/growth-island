import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceRoot = path.resolve("assets/generated/spirits");
const outputRoot = path.resolve("public/assets/spirits/thumbs");
const states = new Set(["egg-1", "egg-2", "egg-3", "egg-4", "lv2", "lv3", "lv4", "lv5", "lv6", "lv7", "lv8"]);
const concurrency = 2;

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getJobs() {
  const entries = await readdir(sourceRoot, { withFileTypes: true });
  const jobs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^(\d{2})-/);
    if (!match) continue;

    const spiritId = match[1];
    const sourceDir = path.join(sourceRoot, entry.name);
    const outputDir = path.join(outputRoot, spiritId);
    const files = await readdir(sourceDir, { withFileTypes: true });

    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith(".png")) continue;
      const state = file.name.replace(/\.png$/, "");
      if (!states.has(state)) continue;

      jobs.push({
        source: path.join(sourceDir, file.name),
        output: path.join(outputDir, `${state}.webp`),
        outputDir,
      });
    }
  }

  return jobs;
}

async function processJob(job) {
  await mkdir(job.outputDir, { recursive: true });
  if (await exists(job.output)) return "skip";

  await sharp(job.source)
    .resize({
      width: 260,
      height: 220,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: 74,
      effort: 4,
      alphaQuality: 85,
    })
    .toFile(job.output);

  return "write";
}

async function main() {
  const jobs = await getJobs();
  let cursor = 0;
  let written = 0;
  let skipped = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor];
      cursor += 1;
      const result = await processJob(job);
      if (result === "write") written += 1;
      else skipped += 1;
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(`spirit thumbnails ready: ${written} written, ${skipped} skipped, ${jobs.length} total`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
