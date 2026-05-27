const fs = require('fs');
const path = require('path');

const projectRoot = 'F:/TestCode/Points_game';
const generatedRoot = path.join(projectRoot, 'assets/generated');
const manifestPath = path.join(generatedRoot, 'asset-manifest.json');
const batchPath = path.join(generatedRoot, 'batch-03-440-prompts.json');
const imageRoot = 'C:/Users/Rootliu/.codex/generated_images';

const states = ['egg-1', 'egg-2', 'egg-3', 'egg-4', 'lv2', 'lv3', 'lv4', 'lv5', 'lv6', 'lv7', 'lv8'];
const targets = [
  ...['egg-2', 'egg-3', 'lv3', 'lv4', 'lv5', 'lv6'].map((state) => ['26', 'shanhu-tuling', state]),
  ...states.map((state) => ['28', 'yunduo-yangling', state]),
  ...states.map((state) => ['31', 'zhuyin-xiongmaoling', state]),
  ['39', 'guanghuan-moling', 'lv8'],
  ['40', 'tongmeng-shuling', 'egg-4'],
  ['40', 'tongmeng-shuling', 'lv2'],
];

function keyOf(asset) {
  return `${asset.spiritId}|${asset.slug}|${asset.state}`;
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

function latestPng() {
  return listPngs(imageRoot)
    .filter((x) => x.size > 0)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function normalizeSource(file) {
  return file.replace(/\\/g, '/');
}

function finalAbs(finalImagePath) {
  const abs = path.resolve(projectRoot, finalImagePath);
  const spiritsRoot = path.resolve(generatedRoot, 'spirits');
  if (!abs.startsWith(`${spiritsRoot}${path.sep}`)) {
    throw new Error(`Refusing final path outside spirits root: ${abs}`);
  }
  return abs;
}

function targetByIndex(index) {
  if (!Number.isInteger(index) || index < 1 || index > targets.length) {
    throw new Error(`Usage: node copy_latest_raw_asset.cjs <1-${targets.length}> [--prompt|--copy]`);
  }
  const [spiritId, slug, state] = targets[index - 1];
  return { spiritId, slug, state };
}

function findAsset(collection, wanted) {
  const key = `${wanted.spiritId}|${wanted.slug}|${wanted.state}`;
  const asset = collection.find((item) => keyOf(item) === key);
  if (!asset) throw new Error(`Missing asset: ${key}`);
  return asset;
}

const index = Number(process.argv[2]);
const mode = process.argv[3] || '--copy';
const wanted = targetByIndex(index);
const batch = loadJson(batchPath).assets;
const batchAsset = findAsset(batch, wanted);

if (mode === '--prompt') {
  console.log(batchAsset.prompt);
  process.exit(0);
}

if (mode !== '--copy') throw new Error(`Unknown mode: ${mode}`);

const source = latestPng();
if (!source) throw new Error(`No PNG found under ${imageRoot}`);

const manifest = loadJson(manifestPath);
const manifestAsset = findAsset(manifest.assets, wanted);
const destination = finalAbs(manifestAsset.finalImagePath);
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source.file, destination);

manifestAsset.sourceImagePath = normalizeSource(source.file);
manifestAsset.finalImagePath = batchAsset.finalImagePath;
manifestAsset.reviewStatus = 'needs_revision';
manifestAsset.notes = 'Regenerated raw chroma-key source copied to final path for manual cutout; local chroma-key removal intentionally skipped after prior cutout damage.';

saveJson(manifestPath, manifest);

console.log(JSON.stringify({
  index,
  spiritId: wanted.spiritId,
  slug: wanted.slug,
  state: wanted.state,
  sourceImagePath: manifestAsset.sourceImagePath,
  finalImagePath: manifestAsset.finalImagePath,
  copiedTo: destination.replace(/\\/g, '/'),
}, null, 2));
