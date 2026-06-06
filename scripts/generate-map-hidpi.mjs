import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceRoot = path.resolve("public/assets/map/v4");
const outputRoot = path.resolve("public/assets/map/v4-runtime-hidpi");
const scale = Number(process.env.MAP_HIDPI_SCALE || 2);

const hidpiAssets = [
  "batch11/v4-island-shadow-full.png",
  "batch11/v4-island-side-full.png",
  "batch11/v4-island-surface-full.png",
  "batch11/v4-shoreline-foam-ring.png",
  "batch11/v4-route-main-loop.png",
  "batch11/v4-route-shell-branch.png",
  "batch11/v4-route-stone-branch.png",
  "batch11/v4-route-wood-bridge-network.png",
];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function outputPathFor(relativePath) {
  return path.join(outputRoot, relativePath).replace(/\.png$/i, ".webp");
}

async function generate(relativePath) {
  const source = path.join(sourceRoot, relativePath);
  const output = outputPathFor(relativePath);
  if (!(await exists(source))) throw new Error(`Missing source asset: ${source}`);

  const metadata = await sharp(source).metadata();
  const width = metadata.width ? Math.round(metadata.width * scale) : undefined;
  await mkdir(path.dirname(output), { recursive: true });
  const info = await sharp(source)
    .resize({ width, kernel: "lanczos3" })
    .webp({
      quality: 90,
      alphaQuality: 96,
      effort: 5,
      smartSubsample: true,
    })
    .toFile(output);

  return { source, output, bytes: info.size, width: info.width, height: info.height };
}

async function main() {
  if (!Number.isFinite(scale) || scale <= 1 || scale > 3) {
    throw new Error("MAP_HIDPI_SCALE must be > 1 and <= 3");
  }

  const results = [];
  for (const asset of hidpiAssets) {
    results.push(await generate(asset));
  }

  const totalBytes = results.reduce((sum, result) => sum + result.bytes, 0);
  for (const result of results) {
    const relativeOutput = path.relative(process.cwd(), result.output).replace(/\\/g, "/");
    console.log(`${relativeOutput} ${result.width}x${result.height} ${(result.bytes / 1024).toFixed(0)} KB`);
  }
  console.log(`hidpi map assets ready: ${results.length} written, ${(totalBytes / 1024 / 1024).toFixed(1)} MB total`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
