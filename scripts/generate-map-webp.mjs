import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceRoot = path.resolve("public/assets/map/v4");
const outputRoot = path.resolve("public/assets/map/v4-runtime");
const concurrency = Number(process.env.MAP_WEBP_CONCURRENCY || 2);

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkPngs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkPngs(absolute)));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
      files.push(absolute);
    }
  }

  return files;
}

function outputPathFor(source) {
  const relative = path.relative(sourceRoot, source);
  return path.join(outputRoot, relative).replace(/\.png$/i, ".webp");
}

async function processJob(source) {
  const output = outputPathFor(source);
  await mkdir(path.dirname(output), { recursive: true });
  if (await exists(output)) return { status: "skip", source, output, bytes: 0 };

  const relative = path.relative(sourceRoot, source).replace(/\\/g, "/");
  const metadata = await sharp(source).metadata();
  const targetWidth = targetRuntimeWidth(relative, metadata.width ?? 0);
  const pipeline = sharp(source);
  if (targetWidth > 0 && metadata.width && metadata.width > targetWidth) {
    pipeline.resize({ width: targetWidth, withoutEnlargement: true });
  }

  const info = await pipeline
    .webp({
      quality: 88,
      alphaQuality: 92,
      effort: 4,
      smartSubsample: true,
    })
    .toFile(output);

  return { status: "write", source, output, bytes: info.size };
}

function targetRuntimeWidth(relativePath, sourceWidth) {
  const fileName = path.basename(relativePath);

  if (fileName.includes("island-") || fileName.includes("shoreline-foam")) return sourceWidth;
  if (fileName.includes("ocean-")) return 820;
  if (fileName.includes("region-")) return 1120;
  if (fileName.includes("route-main-loop")) return 1420;
  if (fileName.includes("route-wood-bridge-network")) return 920;
  if (fileName.includes("route-") || fileName.includes("cliff-stair")) return 840;
  if (fileName.includes("v4-home-")) return 430;
  if (fileName.includes("home-pad") || fileName.includes("home-soft-shadow")) return 380;
  if (fileName.includes("spirit-soft-shadow")) return 260;
  if (fileName.includes("label-") || fileName.includes("effect-")) return 420;
  if (fileName.includes("road-") || fileName.includes("bridge-") || fileName.includes("stair-") || fileName.includes("rail")) return 420;
  if (fileName.includes("edge-") || fileName.includes("reed-") || fileName.includes("mini-bush")) return 260;
  if (fileName.includes("glow") || fileName.includes("arch-blank")) return 360;
  if (fileName.includes("landmark-") || fileName.includes("local-")) return 920;

  return Math.min(sourceWidth, 920);
}

async function main() {
  const jobs = await walkPngs(sourceRoot);
  let cursor = 0;
  let written = 0;
  let skipped = 0;
  let bytes = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const source = jobs[cursor];
      cursor += 1;
      const result = await processJob(source);
      if (result.status === "write") {
        written += 1;
        bytes += result.bytes;
      } else {
        skipped += 1;
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  console.log(
    `map webp ready: ${written} written, ${skipped} skipped, ${jobs.length} total, ${(bytes / 1024 / 1024).toFixed(1)} MB written`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
