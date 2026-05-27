const fs = require('fs');
const path = require('path');

const projectRoot = 'F:/TestCode/Points_game';
const generatedRoot = path.join(projectRoot, 'assets/generated');
const batchPath = path.join(generatedRoot, 'batch-04-110-animal-spirit-prompts.json');
const manifestPath = path.join(generatedRoot, 'asset-manifest.json');
const imageRoot = 'C:/Users/Rootliu/.codex/generated_images';

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function listPngs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listPngs(full));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      const stat = fs.statSync(full);
      out.push({ file: full, mtimeMs: stat.mtimeMs, size: stat.size });
    }
  }
  return out;
}

function keyOf(asset) {
  return `${asset.spiritId}|${asset.slug}|${asset.state}`;
}

function finalAbs(finalImagePath) {
  const abs = path.resolve(projectRoot, finalImagePath);
  const spiritsRoot = path.resolve(generatedRoot, 'spirits');
  if (!abs.startsWith(`${spiritsRoot}${path.sep}`)) {
    throw new Error(`Refusing final path outside spirits root: ${abs}`);
  }
  return abs;
}

const index = Number(process.argv[2]);
const mode = process.argv[3] || '--copy';
const batch = loadJson(batchPath);
const asset = batch.assets[index - 1];
if (!Number.isInteger(index) || !asset) {
  throw new Error(`Usage: node copy_latest_batch04_asset.cjs <1-${batch.assets.length}> [--prompt|--copy]`);
}

if (mode === '--prompt') {
  console.log(asset.prompt);
  process.exit(0);
}
if (mode !== '--copy') throw new Error(`Unknown mode: ${mode}`);

const source = listPngs(imageRoot).filter((x) => x.size > 0).sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
if (!source) throw new Error(`No PNG found under ${imageRoot}`);

const destination = finalAbs(asset.finalImagePath);
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source.file, destination);

const manifest = loadJson(manifestPath);
const manifestAsset = manifest.assets.find((item) => keyOf(item) === keyOf(asset));
if (!manifestAsset) throw new Error(`Missing manifest asset ${keyOf(asset)}`);

manifestAsset.sourceImagePath = source.file.replace(/\\/g, '/');
manifestAsset.finalImagePath = asset.finalImagePath;
manifestAsset.reviewStatus = 'needs_revision';
manifestAsset.notes = 'Raw chroma-key source copied to final path; manual cutout or alpha processing still needed before production use.';
saveJson(manifestPath, manifest);

console.log(JSON.stringify({
  index,
  spiritId: asset.spiritId,
  slug: asset.slug,
  state: asset.state,
  sourceImagePath: manifestAsset.sourceImagePath,
  finalImagePath: asset.finalImagePath,
  copiedTo: destination.replace(/\\/g, '/'),
}, null, 2));
