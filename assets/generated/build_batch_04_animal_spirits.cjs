const fs = require('fs');
const path = require('path');

const root = 'F:/TestCode/Points_game';
const generatedRoot = path.join(root, 'assets/generated');
const batchPath = path.join(generatedRoot, 'batch-04-110-animal-spirit-prompts.json');
const manifestPath = path.join(generatedRoot, 'asset-manifest.json');

const states = [
  ['egg-1', 1],
  ['egg-2', 1],
  ['egg-3', 1],
  ['egg-4', 1],
  ['lv2', 2],
  ['lv3', 3],
  ['lv4', 4],
  ['lv5', 5],
  ['lv6', 6],
  ['lv7', 7],
  ['lv8', 8],
];

const spirits = [
  {
    spiritId: '41',
    name: '月萤狐精灵',
    slug: 'yueying-hu-jingling',
    concept: 'Orange-white little fox spirit with three or nine stylized fluffy tails, a green gemstone crown, and gold vine patterns along the tails.',
    motif: 'orange-white fox, emerald forehead crown, moon-firefly glow, gold vine tail markings',
    palette: 'orange, cream white, emerald green, gold, soft moonlight cyan',
  },
  {
    spiritId: '42',
    name: '星羽鹿精灵',
    slug: 'xingyu-lu-jingling',
    concept: 'Small white deer spirit with short glowing antlers wrapped in starry vines, gentle soft presence.',
    motif: 'white fawn, glowing short antlers, star-vine ornaments, feather-light posture',
    palette: 'white, pale gold, sky blue, lavender starlight',
  },
  {
    spiritId: '43',
    name: '铃兰兔精灵',
    slug: 'linglan-tu-jingling',
    concept: 'White lop-eared rabbit spirit with very large ears, a small flower wreath, and a pale green short cloak.',
    motif: 'large lop ears, lily-of-the-valley flower wreath, short green cloak, gentle floral charm',
    palette: 'white, lily green, soft yellow, pale pink flower accents',
  },
  {
    spiritId: '44',
    name: '云尾小熊猫精灵',
    slug: 'yunwei-xiaoxiongmao-jingling',
    concept: 'Red-brown red panda spirit with a huge fluffy cloud-like tail, small shoulder cape, and honest goofy expression.',
    motif: 'red panda face mask, huge cloud tail, tiny cape, warm rounded body',
    palette: 'red brown, cream, cloud white, warm teal, muted gold',
  },
  {
    spiritId: '45',
    name: '银月猫精灵',
    slug: 'yinyue-mao-jingling',
    concept: 'Silver-white kitten spirit with blue-green heterochromia, crescent mark on the forehead, and a gold bell collar.',
    motif: 'silver kitten, crescent forehead mark, blue-green eyes, golden bell collar',
    palette: 'silver white, moon blue, aqua green, gold',
  },
  {
    spiritId: '46',
    name: '青羽猫头鹰精灵',
    slug: 'qingyu-maotouying-jingling',
    concept: 'Round-faced little owl spirit with teal-blue gradient feathers, tiny wizard hat, and large innocent eyes.',
    motif: 'round owl face, teal-blue feathers, tiny mage hat, bright curious eyes',
    palette: 'teal, sky blue, cream, midnight navy, small gold stars',
  },
  {
    spiritId: '47',
    name: '琥珀松鼠精灵',
    slug: 'hupo-songshu-jingling',
    concept: 'Golden-brown squirrel spirit holding a glowing acorn, with an enormous curled tail and lively cheerful energy.',
    motif: 'amber squirrel, glowing acorn, enormous curled tail, lively little paws',
    palette: 'golden brown, amber, cream, leaf green, warm light',
  },
  {
    spiritId: '48',
    name: '溪光水獭精灵',
    slug: 'xiguang-shuita-jingling',
    concept: 'Small otter spirit hugging a crystal shell, with a soft water-flow halo and blue-green glow.',
    motif: 'little otter, crystal shell, water-flow ring, river sparkle',
    palette: 'blue green, river teal, pearl white, soft aqua light',
  },
  {
    spiritId: '49',
    name: '霜叶狼崽精灵',
    slug: 'shuangye-langzai-jingling',
    concept: 'Gentle little wolf pup spirit, not fierce, silver-gray fur, short boots, small cape, clear calm eyes.',
    motif: 'silver wolf pup, frost leaf cape, tiny boots, clear gentle gaze',
    palette: 'silver gray, frost blue, white, leaf green, soft navy',
  },
  {
    spiritId: '50',
    name: '花露刺猬精灵',
    slug: 'hualu-ciwei-jingling',
    concept: 'Round little hedgehog spirit with tiny flowers and glowing mushrooms growing on its back, the most adorably goofy one.',
    motif: 'round hedgehog, small flowers, glowing mushrooms, dew drops, soft tiny feet',
    palette: 'warm brown, cream, flower pink, leaf green, mushroom glow yellow',
  },
];

const eggRequirement = {
  'egg-1': 'Show a complete fantasy egg, no cracks, with motif markings that preview the animal spirit.',
  'egg-2': 'Show the same fantasy egg with small elegant cracks and subtle inner glow, clearly the next phase after egg-1.',
  'egg-3': 'Show the same fantasy egg with a tiny ear, tail tip, paw, feather, antler tip, flower, shell, or light peeking out, clearly the next phase after egg-2.',
  'egg-4': "Show the same fantasy egg with the spirit's head or key feature emerging, still mostly egg-form.",
};

const levelRequirement = {
  lv2: 'newly hatched young companion, short, rounded, full-body, complete and clearly based on the Lv.1 egg motif',
  lv3: 'same young companion with richer colors and one small glowing charm, slightly more confident than lv2',
  lv4: 'same companion with a subtle virtue emblem or delicate magical pattern, no readable glyphs',
  lv5: 'same companion with more refined body details, cleaner silhouette, and polished ornaments',
  lv6: 'same companion with one small non-weapon equipment ornament such as a bell, leaf cape, crystal, ribbon, bead, badge, tiny boots, or short cloak; no staff or large handheld prop',
  lv7: 'same companion with an orbiting aura, star ring, leaf trail, glow ribbon, water ring, or elemental halo; keep effects attached to the sprite, not a scene',
  lv8: 'same companion as a gentle guardian form, more refined but still short, rounded, adorable, full-body, and child-safe',
};

function promptFor(spirit, state) {
  const keyColor = '#ff00ff';
  if (state.startsWith('egg')) {
    return `Use case: stylized-concept
Asset type: chroma-key source sprite for a transparent RPG game sprite in Beihai Growth Island
Primary request: Create an original fantasy spirit egg for ${spirit.name}, state ${state}. The egg previews this motif: ${spirit.motif}. ${eggRequirement[state]} Preserve the same egg identity across egg phases through palette, ornament language, and motif markings.
Style/medium: high-finish original fantasy RPG companion art, polished 2D anime fantasy illustration, refined magical creature design, collectible quality, suitable for kindergarten children but not low-detail clip art.
Composition/framing: single centered full-body egg sprite on a perfectly flat solid ${keyColor} chroma-key background for background removal, clean readable silhouette, generous padding.
Critical chroma-key requirement: the entire background must be one uniform flat ${keyColor} field from edge to edge, with no shadows, gradients, texture, checkerboard, floor, vignette, glow spill, or lighting variation. Do not use ${keyColor} anywhere in the subject.
Continuity requirement: evolve the existing motif gradually; refinement and ornaments may increase, but do not replace the spirit with an unrelated design.
Subject direction: The egg must remain an egg-form sprite, not a character portrait or scene.
Lighting/mood: soft magical glow, gentle inviting expression where visible, premium collectible sprite feel.
Color palette: ${spirit.palette}, with tasteful accent colors.
Materials/textures: smooth shell, tiny fur/feather/leaf/flower/crystal details where appropriate, pearl-like highlights, delicate magical markings.
Constraints: original design, no text, no logo, no watermark, no UI, no weapon, no scary monster, no realistic 3D render, no checkerboard background, no cast shadow, no contact shadow, no floor plane. No readable letters, numbers, Chinese characters, formulas, UI icons, or logo-like symbols. No staff, wand, sword, spear, large handheld prop, base platform, or background scene.
Avoid: copying Genshin Impact, Nahida, Pokemon, Digimon, Disney, Sanrio, or any commercial IP; avoid existing character hairstyle, outfit structure, accessories, symbols, poses, or color layouts; avoid cheap sticker style, generic mascot look, oversized baby eyes, and plush-toy proportions.`;
  }

  return `Use case: stylized-concept
Asset type: chroma-key source sprite for a transparent RPG game sprite in Beihai Growth Island
Primary request: Create ${spirit.name} ${state}, an original fantasy spirit companion. Core concept: ${spirit.concept}. For this state, show ${levelRequirement[state]}. Keep it clearly the same creature/entity family across levels with the same core silhouette, eyes, motif, and palette family.
Style/medium: high-finish original fantasy RPG companion art, polished 2D anime fantasy illustration, refined magical creature design, collectible quality, child-safe but not low-detail clip art and not preschool mascot.
Composition/framing: single centered full-body animal spirit companion sprite on a perfectly flat solid ${keyColor} chroma-key background for background removal, clean readable silhouette, generous padding. Body proportions must be short, rounded, squat, and adorable.
Critical chroma-key requirement: the entire background must be one uniform flat ${keyColor} field from edge to edge, with no shadows, gradients, texture, checkerboard, floor, vignette, glow spill, or lighting variation. Do not use ${keyColor} anywhere in the subject.
Continuity requirement: evolve the existing motif gradually; refinement and ornaments may increase, but do not replace the spirit with an unrelated design.
Subject direction: Non-human animal spirit only. Full body must be visible. Do not make a human child, elf, fairy girl, doll, ordinary pet, classroom mascot, or plush toy.
Lighting/mood: luminous eyes where applicable, soft magical glow, gentle inviting expression, premium collectible sprite feel.
Color palette: ${spirit.palette}, with tasteful accent colors.
Materials/textures: soft fur, tiny ornaments, leaves, crystals, feathers, flowers, shell, pearl, cloth-like magic, starlight, water glow, frost glow, or elemental details as appropriate to the concept.
Constraints: original design, no text, no logo, no watermark, no UI, no weapon, no scary monster, no realistic 3D render, no checkerboard background, no cast shadow, no contact shadow, no floor plane. No readable letters, numbers, Chinese characters, formulas, UI icons, or logo-like symbols. No staff, wand, sword, spear, large handheld prop, base platform, or background scene.
Avoid: copying Genshin Impact, Nahida, Pokemon, Digimon, Disney, Sanrio, or any commercial IP; avoid existing character hairstyle, outfit structure, accessories, symbols, poses, or color layouts; avoid cheap sticker style, generic mascot look, oversized baby eyes, and plush-toy proportions.`;
}

const assets = [];
for (const spirit of spirits) {
  for (const [state, level] of states) {
    assets.push({
      spiritId: spirit.spiritId,
      name: spirit.name,
      slug: spirit.slug,
      state,
      level,
      prompt: promptFor(spirit, state),
      sourceImagePath: '',
      finalImagePath: `assets/generated/spirits/${spirit.spiritId}-${spirit.slug}/${state}.png`,
      reviewStatus: 'pending',
      notes: '',
    });
  }
}

fs.writeFileSync(batchPath, `${JSON.stringify({ states: states.map(([state]) => state), count: assets.length, assets }, null, 2)}\n`, 'utf8');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const byKey = new Map(manifest.assets.map((asset, index) => [`${asset.spiritId}|${asset.slug}|${asset.state}`, index]));
for (const asset of assets) {
  const key = `${asset.spiritId}|${asset.slug}|${asset.state}`;
  if (byKey.has(key)) manifest.assets[byKey.get(key)] = { ...manifest.assets[byKey.get(key)], ...asset };
  else manifest.assets.push(asset);
}
manifest.spiritCount = Math.max(Number(manifest.spiritCount || 0), 50);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ batchPath, addedOrUpdated: assets.length, manifestCount: manifest.assets.length }, null, 2));
