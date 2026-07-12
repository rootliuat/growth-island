import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const outputRoot = path.resolve("public/assets/map/3d-props/p15");
const qaRoot = path.resolve("assets/generated/map-3d-props/p15");
const rendererRoot = path.resolve("qa-artifacts/p15-map-3d-props");
const canvasSize = 512;
const publicBase = "/assets/map/3d-props/p15";

const jobs = [
  { id: "p15-prop-tree", label: "树", source: "model/ultimateplatformer/Nature/glTF/Tree.gltf", width: 240, yaw: -0.38, usage: "home-grove" },
  { id: "p15-prop-tree-fruit", label: "果树", source: "model/ultimateplatformer/Nature/glTF/Tree_Fruit.gltf", width: 250, yaw: 0.42, usage: "home-grove" },
  { id: "p15-prop-bush", label: "灌木", source: "model/ultimateplatformer/Nature/glTF/Bush.gltf", width: 190, yaw: -0.2, usage: "home-grove" },
  { id: "p15-prop-bush-fruit", label: "果灌木", source: "model/ultimateplatformer/Nature/glTF/Bush_Fruit.gltf", width: 190, yaw: 0.32, usage: "home-grove" },
  { id: "p15-prop-grass-1", label: "草丛1", source: "model/ultimateplatformer/Nature/glTF/Grass_1.gltf", width: 150, yaw: -0.2, usage: "path-edge" },
  { id: "p15-prop-grass-2", label: "草丛2", source: "model/ultimateplatformer/Nature/glTF/Grass_2.gltf", width: 150, yaw: 0.16, usage: "path-edge" },
  { id: "p15-prop-rock-1", label: "石头1", source: "model/ultimateplatformer/Nature/glTF/Rock_1.gltf", width: 145, yaw: -0.32, usage: "path-edge" },
  { id: "p15-prop-rock-2", label: "石头2", source: "model/ultimateplatformer/Nature/glTF/Rock_2.gltf", width: 145, yaw: 0.38, usage: "path-edge" },
  { id: "p15-prop-plant-large", label: "大植物", source: "model/ultimateplatformer/Level and Mechanics/glTF/Plant_Large.gltf", width: 170, yaw: -0.18, usage: "path-edge" },
  { id: "p15-prop-plant-small", label: "小植物", source: "model/ultimateplatformer/Level and Mechanics/glTF/Plant_Small.gltf", width: 140, yaw: 0.28, usage: "path-edge" },
  { id: "p15-prop-bridge-small", label: "小桥", source: "model/ultimateplatformer/Level and Mechanics/glTF/Bridge_Small.gltf", width: 270, yaw: -0.52, usage: "path-landmark" },
  { id: "p15-prop-bridge-modular", label: "木桥", source: "model/ultimateplatformer/Level and Mechanics/glTF/Bridge_Modular.gltf", width: 300, yaw: 0.46, usage: "path-landmark" },
  { id: "p15-prop-fence-1", label: "栅栏", source: "model/ultimateplatformer/Level and Mechanics/glTF/Fence_1.gltf", width: 200, yaw: -0.54, usage: "path-edge" },
  { id: "p15-prop-fence-corner", label: "转角栅栏", source: "model/ultimateplatformer/Level and Mechanics/glTF/Fence_Corner.gltf", width: 190, yaw: 0.7, usage: "path-edge" },
  { id: "p15-prop-fence-middle", label: "长栅栏", source: "model/ultimateplatformer/Level and Mechanics/glTF/Fence_Middle.gltf", width: 215, yaw: 0.18, usage: "path-edge" },
  { id: "p15-prop-door", label: "小门", source: "model/ultimateplatformer/Level and Mechanics/glTF/Door.gltf", width: 155, yaw: 0.18, usage: "home-gate" },
  { id: "p15-prop-stairs-small", label: "石阶", source: "model/ultimateplatformer/Level and Mechanics/glTF/Stairs_Small.gltf", width: 195, yaw: -0.42, usage: "path-landmark" },
  { id: "p15-prop-goal-flag", label: "旗帜", source: "model/ultimateplatformer/Level and Mechanics/glTF/Goal_Flag.gltf", width: 160, yaw: -0.18, usage: "honor" },
  { id: "p15-prop-chest", label: "宝箱", source: "model/ultimateplatformer/Level and Mechanics/glTF/Chest.gltf", width: 175, yaw: -0.35, usage: "shop" },
  { id: "p15-prop-coin", label: "金币", source: "model/ultimateplatformer/Powerups and Pickups/glTF/Coin.gltf", width: 110, yaw: 0.12, usage: "shop" },
  { id: "p15-prop-gem-blue", label: "蓝宝石", source: "model/ultimateplatformer/Powerups and Pickups/glTF/Gem_Blue.gltf", width: 120, yaw: -0.25, usage: "shop" },
  { id: "p15-prop-gem-green", label: "绿宝石", source: "model/ultimateplatformer/Powerups and Pickups/glTF/Gem_Green.gltf", width: 120, yaw: 0.28, usage: "shop" },
  { id: "p15-prop-gem-pink", label: "粉宝石", source: "model/ultimateplatformer/Powerups and Pickups/glTF/Gem_Pink.gltf", width: 120, yaw: -0.18, usage: "shop" },
  { id: "p15-prop-key", label: "钥匙", source: "model/ultimateplatformer/Powerups and Pickups/glTF/Key.gltf", width: 125, yaw: 0.42, usage: "shop" },
  { id: "p15-prop-star", label: "星光", source: "model/ultimateplatformer/Powerups and Pickups/glTF/Star.gltf", width: 130, yaw: -0.28, usage: "honor" },
];

function outputName(job) {
  return `${job.id}.webp`;
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".gltf")) return "model/gltf+json";
  return "application/octet-stream";
}

async function startStaticServer() {
  const root = process.cwd();
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const relative = decodeURIComponent(requestUrl.pathname.replace(/^\/+/, ""));
      const filePath = path.resolve(root, relative || "index.html");
      if (filePath !== root && !filePath.startsWith(root + path.sep)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      const body = await readFile(filePath);
      response.writeHead(200, { "Content-Type": contentTypeFor(filePath) });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function makeRendererPage(browser, origin) {
  const page = await browser.newPage({ viewport: { width: canvasSize, height: canvasSize }, deviceScaleFactor: 1 });
  page.on("console", (message) => console.log(`[p15 renderer] ${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => console.error(`[p15 renderer] ${error.message}`));
  const threeUrl = `${origin}/node_modules/three/build/three.module.js`;
  const loaderUrl = `${origin}/node_modules/three/examples/jsm/loaders/GLTFLoader.js`;
  await mkdir(rendererRoot, { recursive: true });
  const rendererHtmlPath = path.join(rendererRoot, "bake-renderer.html");
  await writeFile(rendererHtmlPath, `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script type="importmap">
      { "imports": { "three": ${JSON.stringify(threeUrl)} } }
    </script>
    <style>
      html, body { margin: 0; width: ${canvasSize}px; height: ${canvasSize}px; overflow: hidden; background: transparent; }
      canvas { width: ${canvasSize}px; height: ${canvasSize}px; display: block; }
    </style>
  </head>
  <body>
    <canvas id="stage" width="${canvasSize}" height="${canvasSize}"></canvas>
    <script type="module">
      import * as THREE from "three";
      import { GLTFLoader } from ${JSON.stringify(loaderUrl)};

      const canvas = document.getElementById("stage");
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(${canvasSize}, ${canvasSize}, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const loader = new GLTFLoader();

      function clearScene(scene) {
        scene.traverse((node) => {
          if (!node.isMesh) return;
          node.geometry?.dispose?.();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => material?.dispose?.());
        });
      }

      window.renderGltfAsset = async ({ modelText, yaw = 0, fit = 2.55 }) => {
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-2.05, 2.05, 2.05, -2.05, 0.1, 100);
        camera.position.set(4.8, 3.2, 4.8);
        camera.lookAt(0, 0.72, 0);

        const ambient = new THREE.HemisphereLight(0xffffff, 0xc9e4d2, 2.35);
        const key = new THREE.DirectionalLight(0xffffff, 2.9);
        key.position.set(4.5, 5.6, 4.2);
        const fill = new THREE.DirectionalLight(0x8fd7d1, 0.86);
        fill.position.set(-3.5, 2.4, 2.2);
        scene.add(ambient, key, fill);

        const blob = new Blob([modelText], { type: "model/gltf+json" });
        const url = URL.createObjectURL(blob);
        const gltf = await loader.loadAsync(url);
        URL.revokeObjectURL(url);

        const root = gltf.scene;
        root.rotation.y = yaw;
        scene.add(root);
        root.traverse((node) => {
          if (!node.isMesh) return;
          node.frustumCulled = false;
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => {
            if (!material) return;
            material.side = THREE.DoubleSide;
            material.needsUpdate = true;
          });
        });

        let box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        root.position.sub(center);
        box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z, 0.001);
        root.scale.setScalar(fit / maxAxis);
        box = new THREE.Box3().setFromObject(root);
        root.position.y -= box.min.y;

        const shadow = new THREE.Mesh(
          new THREE.CircleGeometry(0.72, 48),
          new THREE.MeshBasicMaterial({ color: 0x123d47, transparent: true, opacity: 0.15, depthWrite: false }),
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.scale.set(1.18, 0.44, 1);
        shadow.position.set(0, -0.02, 0);
        scene.add(shadow);

        renderer.clear();
        renderer.render(scene, camera);
        const dataUrl = canvas.toDataURL("image/png");
        clearScene(scene);
        return dataUrl;
      };
    </script>
  </body>
</html>`);
  const rendererRelative = path.relative(process.cwd(), rendererHtmlPath).replace(/\\/g, "/");
  await page.goto(`${origin}/${rendererRelative}`);
  await page.waitForFunction(() => typeof window.renderGltfAsset === "function", undefined, { timeout: 15_000 });
  return page;
}

async function renderJob(page, job) {
  const modelText = await readFile(path.resolve(job.source), "utf8");
  const dataUrl = await page.evaluate(({ modelText, yaw }) => window.renderGltfAsset({ modelText, yaw }), {
    modelText,
    yaw: job.yaw,
  });
  return Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");
}

async function writeAsset(job, pngBuffer) {
  const outputPath = path.join(outputRoot, outputName(job));
  const qaPngPath = path.join(qaRoot, "source", `${job.id}.png`);
  const normalized = sharp(pngBuffer)
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 4 })
    .extend({ top: 18, right: 18, bottom: 18, left: 18, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({ width: job.width, height: job.width, fit: "inside", withoutEnlargement: false });

  await normalized.png().toFile(qaPngPath);
  const info = await normalized
    .webp({
      quality: 78,
      alphaQuality: 88,
      effort: 5,
      smartSubsample: true,
    })
    .toFile(outputPath);

  return {
    id: job.id,
    label: job.label,
    source: job.source,
    output: `${publicBase}/${outputName(job)}`,
    qaSource: path.relative(process.cwd(), qaPngPath).replace(/\\/g, "/"),
    width: job.width,
    usage: job.usage,
    bytes: info.size,
  };
}

async function writeContactSheet(records) {
  const cell = 190;
  const columns = 5;
  const rows = Math.ceil(records.length / columns);
  const width = columns * cell;
  const height = rows * cell;
  const composites = [];

  for (const [index, record] of records.entries()) {
    const x = (index % columns) * cell;
    const y = Math.floor(index / columns) * cell;
    const pngBuffer = await sharp(record.qaSource)
      .resize({ width: 132, height: 116, fit: "inside" })
      .png()
      .toBuffer();
    const labelSvg = Buffer.from(`
<svg width="${cell}" height="42" xmlns="http://www.w3.org/2000/svg">
  <text x="${cell / 2}" y="18" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#174c5a">${escapeHtml(record.label)}</text>
  <text x="${cell / 2}" y="34" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#5f746d">${escapeHtml(record.id)}</text>
</svg>`);
    composites.push({ input: pngBuffer, left: x + 29, top: y + 16 });
    composites.push({ input: labelSvg, left: x, top: y + 138 });
  }

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 248, b: 234, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(qaRoot, "p15-map-3d-props-qa.png"));
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  await mkdir(path.join(qaRoot, "source"), { recursive: true });

  const force = process.env.P15_FORCE === "1";
  const staticServer = await startStaticServer();
  let browser;
  const records = [];

  try {
    browser = await chromium.launch({ headless: true });
    const page = await makeRendererPage(browser, staticServer.origin);
    for (const job of jobs) {
      const outputPath = path.join(outputRoot, outputName(job));
      if (!force && await exists(outputPath)) {
        const stats = await stat(outputPath);
        records.push({
          id: job.id,
          label: job.label,
          source: job.source,
          output: `${publicBase}/${outputName(job)}`,
          qaSource: path.join(qaRoot, "source", `${job.id}.png`).replace(/\\/g, "/"),
          width: job.width,
          usage: job.usage,
          bytes: stats.size,
          skipped: true,
        });
        continue;
      }

      const png = await renderJob(page, job);
      records.push(await writeAsset(job, png));
    }
  } finally {
    await browser?.close();
    await staticServer.close();
  }

  await writeFile(path.join(qaRoot, "p15-map-3d-props.manifest.json"), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: records.length,
    totalBytes: records.reduce((sum, record) => sum + record.bytes, 0),
    records,
  }, null, 2)}\n`);
  await writeContactSheet(records);

  const totalMb = records.reduce((sum, record) => sum + record.bytes, 0) / 1024 / 1024;
  console.log(`P15 map 3D props ready: ${records.length} files, ${totalMb.toFixed(2)} MB`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
