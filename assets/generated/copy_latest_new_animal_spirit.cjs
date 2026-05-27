const fs = require('fs');
const path = require('path');

const projectRoot = 'F:/TestCode/Points_game';
const imageRoot = 'C:/Users/Rootliu/.codex/generated_images';

const targets = [
  ['41', 'yueying-hu', 'lv2'],
  ['42', 'xingyu-lu', 'lv2'],
  ['43', 'linglan-tu', 'lv2'],
  ['44', 'yunwei-xiaoxiongmao', 'lv2'],
  ['45', 'yinyue-mao', 'lv2'],
  ['46', 'qingyu-maotouying', 'lv2'],
  ['47', 'hupo-songshu', 'lv2'],
  ['48', 'xiguang-shuita', 'lv2'],
  ['49', 'shuangye-langzai', 'lv2'],
  ['50', 'hualu-ciwei', 'lv2'],
];

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

const index = Number(process.argv[2]);
if (!Number.isInteger(index) || index < 1 || index > targets.length) {
  throw new Error(`Usage: node copy_latest_new_animal_spirit.cjs <1-${targets.length}>`);
}

const source = listPngs(imageRoot).filter((x) => x.size > 0).sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
if (!source) throw new Error(`No PNG found under ${imageRoot}`);

const [id, slug, state] = targets[index - 1];
const destination = path.join(projectRoot, 'assets/generated/spirits', `${id}-${slug}`, `${state}.png`);
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(source.file, destination);

console.log(JSON.stringify({
  index,
  sourceImagePath: source.file.replace(/\\/g, '/'),
  finalImagePath: destination.replace(/\\/g, '/'),
}, null, 2));
