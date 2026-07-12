import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const outputRoot = path.resolve("public/assets/map/3d-props/p16");
const qaRoot = path.resolve("assets/generated/map-3d-props/p16");
const rendererRoot = path.resolve("qa-artifacts/p16-map-3d-props");
const canvasSize = 512;
const publicBase = "/assets/map/3d-props/p16";

const jobs = [
  { id: "p16-prop-house-1", label: "小屋1", kind: "obj", source: "model/medievalvillage/Buildings/OBJ/House_1.obj", mtl: "model/medievalvillage/Buildings/OBJ/House_1.mtl", width: 250, yaw: -0.32, usage: "home-cabin" },
  { id: "p16-prop-house-2", label: "小屋2", kind: "obj", source: "model/medievalvillage/Buildings/OBJ/House_2.obj", mtl: "model/medievalvillage/Buildings/OBJ/House_2.mtl", width: 250, yaw: 0.24, usage: "home-cabin" },
  { id: "p16-prop-house-3", label: "小屋3", kind: "obj", source: "model/medievalvillage/Buildings/OBJ/House_3.obj", mtl: "model/medievalvillage/Buildings/OBJ/House_3.mtl", width: 250, yaw: -0.18, usage: "home-cabin" },
  { id: "p16-prop-house-4", label: "小屋4", kind: "obj", source: "model/medievalvillage/Buildings/OBJ/House_4.obj", mtl: "model/medievalvillage/Buildings/OBJ/House_4.mtl", width: 250, yaw: 0.34, usage: "home-cabin" },
  { id: "p16-prop-stable", label: "小棚屋", kind: "obj", source: "model/medievalvillage/Buildings/OBJ/Stable.obj", mtl: "model/medievalvillage/Buildings/OBJ/Stable.mtl", width: 270, yaw: 0.42, usage: "home-cabin" },
  { id: "p16-prop-bell-tower", label: "荣誉铃塔", kind: "obj", source: "model/medievalvillage/Buildings/OBJ/Bell_Tower.obj", mtl: "model/medievalvillage/Buildings/OBJ/Bell_Tower.mtl", width: 285, yaw: 0.2, usage: "honor" },
  { id: "p16-prop-market-stand-1", label: "小铺摊1", kind: "obj", source: "model/medievalvillage/Props/OBJ/MarketStand_1.obj", mtl: "model/medievalvillage/Props/OBJ/MarketStand_1.mtl", width: 220, yaw: -0.34, usage: "shop" },
  { id: "p16-prop-market-stand-2", label: "小铺摊2", kind: "obj", source: "model/medievalvillage/Props/OBJ/MarketStand_2.obj", mtl: "model/medievalvillage/Props/OBJ/MarketStand_2.mtl", width: 220, yaw: 0.28, usage: "shop" },
  { id: "p16-prop-cart", label: "小推车", kind: "obj", source: "model/medievalvillage/Props/OBJ/Cart.obj", mtl: "model/medievalvillage/Props/OBJ/Cart.mtl", width: 205, yaw: -0.42, usage: "shop" },
  { id: "p16-prop-gazebo", label: "小亭", kind: "obj", source: "model/medievalvillage/Props/OBJ/Gazebo.obj", mtl: "model/medievalvillage/Props/OBJ/Gazebo.mtl", width: 245, yaw: -0.22, usage: "home-cabin" },
  { id: "p16-prop-bell", label: "铃铛", kind: "obj", source: "model/medievalvillage/Props/OBJ/Bell.obj", mtl: "model/medievalvillage/Props/OBJ/Bell.mtl", width: 150, yaw: 0.16, usage: "honor" },
  { id: "p16-prop-bench-1", label: "长椅1", kind: "obj", source: "model/medievalvillage/Props/OBJ/Bench_1.obj", mtl: "model/medievalvillage/Props/OBJ/Bench_1.mtl", width: 180, yaw: -0.44, usage: "path-edge" },
  { id: "p16-prop-bench-2", label: "长椅2", kind: "obj", source: "model/medievalvillage/Props/OBJ/Bench_2.obj", mtl: "model/medievalvillage/Props/OBJ/Bench_2.mtl", width: 180, yaw: 0.36, usage: "path-edge" },
  { id: "p16-prop-fence", label: "村庄栅栏", kind: "obj", source: "model/medievalvillage/Props/OBJ/Fence.obj", mtl: "model/medievalvillage/Props/OBJ/Fence.mtl", width: 185, yaw: 0.42, usage: "path-edge" },
  { id: "p16-prop-stairs", label: "村庄台阶", kind: "obj", source: "model/medievalvillage/Props/OBJ/Stairs.obj", mtl: "model/medievalvillage/Props/OBJ/Stairs.mtl", width: 190, yaw: -0.28, usage: "path-edge" },
  { id: "p16-prop-barrel", label: "木桶", kind: "obj", source: "model/medievalvillage/Props/OBJ/Barrel.obj", mtl: "model/medievalvillage/Props/OBJ/Barrel.mtl", width: 140, yaw: 0.22, usage: "shop" },
  { id: "p16-prop-crate", label: "木箱", kind: "obj", source: "model/medievalvillage/Props/OBJ/Crate.obj", mtl: "model/medievalvillage/Props/OBJ/Crate.mtl", width: 145, yaw: -0.18, usage: "shop" },
  { id: "p16-prop-bags", label: "货袋", kind: "obj", source: "model/medievalvillage/Props/OBJ/Bags.obj", mtl: "model/medievalvillage/Props/OBJ/Bags.mtl", width: 150, yaw: 0.16, usage: "shop" },
  { id: "p16-prop-bag-open", label: "开袋", kind: "obj", source: "model/medievalvillage/Props/OBJ/Bag_Open.obj", mtl: "model/medievalvillage/Props/OBJ/Bag_Open.mtl", width: 145, yaw: -0.16, usage: "shop" },
  { id: "p16-prop-package-1", label: "包裹1", kind: "obj", source: "model/medievalvillage/Props/OBJ/Package_1.obj", mtl: "model/medievalvillage/Props/OBJ/Package_1.mtl", width: 150, yaw: 0.32, usage: "shop" },
  { id: "p16-prop-package-2", label: "包裹2", kind: "obj", source: "model/medievalvillage/Props/OBJ/Package_2.obj", mtl: "model/medievalvillage/Props/OBJ/Package_2.mtl", width: 150, yaw: -0.36, usage: "shop" },
  { id: "p16-prop-grass-3", label: "草丛3", kind: "gltf", source: "model/ultimateplatformer/Nature/glTF/Grass_3.gltf", width: 150, yaw: 0.18, usage: "path-edge" },
  { id: "p16-prop-fruit", label: "果子", kind: "gltf", source: "model/ultimateplatformer/Nature/glTF/Fruit.gltf", width: 130, yaw: -0.18, usage: "growth" },
  { id: "p16-prop-star-outline", label: "星环", kind: "gltf", source: "model/ultimateplatformer/Powerups and Pickups/glTF/Star_Outline.gltf", width: 135, yaw: 0.24, usage: "honor" },
  { id: "p16-prop-heart", label: "成长心", kind: "gltf", source: "model/ultimateplatformer/Powerups and Pickups/glTF/Heart.gltf", width: 130, yaw: -0.22, usage: "growth" },
  { id: "p16-prop-heart-outline", label: "心环", kind: "gltf", source: "model/ultimateplatformer/Powerups and Pickups/glTF/Heart_Outline.gltf", width: 135, yaw: 0.2, usage: "honor" },
  { id: "p16-prop-rock-platform-1", label: "岩台1", kind: "gltf", source: "model/ultimateplatformer/Nature/glTF/RockPlatforms_1.gltf", width: 210, yaw: -0.3, usage: "path-edge" },
  { id: "p16-prop-rock-platform-2", label: "岩台2", kind: "gltf", source: "model/ultimateplatformer/Nature/glTF/RockPlatforms_2.gltf", width: 210, yaw: 0.28, usage: "path-edge" },
  { id: "p16-prop-rock-platform-large", label: "大岩台", kind: "gltf", source: "model/ultimateplatformer/Nature/glTF/RockPlatforms_Large.gltf", width: 240, yaw: -0.16, usage: "path-edge" },
  { id: "p16-prop-tower", label: "小塔", kind: "gltf", source: "model/ultimateplatformer/Level and Mechanics/glTF/Tower.gltf", width: 165, yaw: 0.24, usage: "honor" },
  { id: "p16-prop-stairs-modular-start", label: "起步台阶", kind: "gltf", source: "model/ultimateplatformer/Level and Mechanics/glTF/Stairs_Modular_Start.gltf", width: 190, yaw: -0.3, usage: "path-edge" },
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
  if (filePath.endsWith(".obj")) return "text/plain; charset=utf-8";
  if (filePath.endsWith(".mtl")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function browserUrl(origin, filePath) {
  return `${origin}/${encodeURI(filePath.replace(/\\/g, "/"))}`;
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
  page.on("console", (message) => console.log(`[p16 renderer] ${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => console.error(`[p16 renderer] ${error.message}`));
  const threeUrl = `${origin}/node_modules/three/build/three.module.js`;
  const gltfLoaderUrl = `${origin}/node_modules/three/examples/jsm/loaders/GLTFLoader.js`;
  const mtlLoaderUrl = `${origin}/node_modules/three/examples/jsm/loaders/MTLLoader.js`;
  const objLoaderUrl = `${origin}/node_modules/three/examples/jsm/loaders/OBJLoader.js`;
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
      import { GLTFLoader } from ${JSON.stringify(gltfLoaderUrl)};
      import { MTLLoader } from ${JSON.stringify(mtlLoaderUrl)};
      import { OBJLoader } from ${JSON.stringify(objLoaderUrl)};

      const canvas = document.getElementById("stage");
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(${canvasSize}, ${canvasSize}, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const gltfLoader = new GLTFLoader();
      const objLoader = new OBJLoader();
      const mtlLoader = new MTLLoader();

      function clearScene(scene) {
        scene.traverse((node) => {
          if (!node.isMesh) return;
          node.geometry?.dispose?.();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => material?.dispose?.());
        });
      }

      function tuneObjMaterial(material) {
        if (!material?.color) return;
        const hsl = {};
        material.color.getHSL(hsl);
        const targetLightness = Math.min(0.72, Math.max(hsl.l + 0.16, 0.42));
        const targetSaturation = Math.min(0.72, Math.max(hsl.s * 0.9, 0.28));
        material.color.setHSL(hsl.h, targetSaturation, targetLightness);
        if ("roughness" in material) material.roughness = 0.82;
        if ("metalness" in material) material.metalness = 0.02;
        if (material.emissive) {
          material.emissive.copy(material.color).multiplyScalar(0.045);
        }
      }

      function prepareRoot(root, yaw, kind) {
        root.rotation.y = yaw;
        root.traverse((node) => {
          if (!node.isMesh) return;
          node.frustumCulled = false;
          node.castShadow = false;
          node.receiveShadow = false;
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => {
            if (!material) return;
            material.side = THREE.DoubleSide;
            if (kind === "obj") tuneObjMaterial(material);
            material.needsUpdate = true;
          });
        });
      }

      function fitRoot(root, fit) {
        let box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        root.position.sub(center);
        box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z, 0.001);
        root.scale.setScalar(fit / maxAxis);
        box = new THREE.Box3().setFromObject(root);
        root.position.y -= box.min.y;
      }

      async function makeRoot({ kind, modelText, modelUrl, mtlUrl, yaw }) {
        if (kind === "obj") {
          const materials = await mtlLoader.loadAsync(mtlUrl);
          materials.preload();
          objLoader.setMaterials(materials);
          const root = await objLoader.loadAsync(modelUrl);
          prepareRoot(root, yaw, kind);
          return root;
        }

        const blob = new Blob([modelText], { type: "model/gltf+json" });
        const url = URL.createObjectURL(blob);
        const gltf = await gltfLoader.loadAsync(url);
        URL.revokeObjectURL(url);
        prepareRoot(gltf.scene, yaw, kind);
        return gltf.scene;
      }

      window.renderP16Asset = async ({ kind, modelText, modelUrl, mtlUrl, yaw = 0, fit = 2.55 }) => {
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

        const root = await makeRoot({ kind, modelText, modelUrl, mtlUrl, yaw });
        scene.add(root);
        fitRoot(root, fit);

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
  await page.waitForFunction(() => typeof window.renderP16Asset === "function", undefined, { timeout: 15_000 });
  return page;
}

async function renderJob(page, origin, job) {
  const modelText = job.kind === "gltf" ? await readFile(path.resolve(job.source), "utf8") : "";
  const dataUrl = await page.evaluate(
    ({ kind, modelText, modelUrl, mtlUrl, yaw }) => window.renderP16Asset({ kind, modelText, modelUrl, mtlUrl, yaw }),
    {
      kind: job.kind,
      modelText,
      modelUrl: browserUrl(origin, job.source),
      mtlUrl: job.mtl ? browserUrl(origin, job.mtl) : "",
      yaw: job.yaw,
    },
  );
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
    kind: job.kind,
    source: job.source,
    mtl: job.mtl,
    output: `${publicBase}/${outputName(job)}`,
    qaSource: path.relative(process.cwd(), qaPngPath).replace(/\\/g, "/"),
    width: job.width,
    usage: job.usage,
    bytes: info.size,
  };
}

async function writeContactSheet(records) {
  const cell = 190;
  const columns = 6;
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
    .toFile(path.join(qaRoot, "p16-map-3d-props-qa.png"));
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  await mkdir(path.join(qaRoot, "source"), { recursive: true });

  const force = process.env.P16_FORCE === "1";
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
          kind: job.kind,
          source: job.source,
          mtl: job.mtl,
          output: `${publicBase}/${outputName(job)}`,
          qaSource: path.join(qaRoot, "source", `${job.id}.png`).replace(/\\/g, "/"),
          width: job.width,
          usage: job.usage,
          bytes: stats.size,
          skipped: true,
        });
        continue;
      }

      const png = await renderJob(page, staticServer.origin, job);
      records.push(await writeAsset(job, png));
    }
  } finally {
    await browser?.close();
    await staticServer.close();
  }

  await writeFile(path.join(qaRoot, "p16-map-3d-props.manifest.json"), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: records.length,
    totalBytes: records.reduce((sum, record) => sum + record.bytes, 0),
    records,
  }, null, 2)}\n`);
  await writeContactSheet(records);

  const totalMb = records.reduce((sum, record) => sum + record.bytes, 0) / 1024 / 1024;
  console.log(`P16 map 3D props ready: ${records.length} files, ${totalMb.toFixed(2)} MB`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
