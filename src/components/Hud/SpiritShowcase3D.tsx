import { Box, Rotate3D, Sparkles, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AnimationClip,
  AnimationMixer,
  Clock,
  Material,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import type { ChildWithProgress, SpiritDefinition } from "../../types";

type ShowcaseModelKey = "growth-sprite" | "cloudwing-sprite" | "shellbay-sprite";
type ShowcaseStatus = "loading" | "ready" | "fallback";

interface ShowcaseModel {
  key: ShowcaseModelKey;
  label: string;
  mood: string;
  asset: string;
  animationNames: string[];
  height: number;
  yOffset: number;
}

interface SpiritShowcase3DProps {
  child: ChildWithProgress;
  spirit: SpiritDefinition;
  spiritAssetUrl?: string;
  onClose: () => void;
}

interface SpiritShowcaseCanvasProps {
  child: ChildWithProgress;
  spirit: SpiritDefinition;
  spiritAssetUrl?: string;
  model: ShowcaseModel;
}

type LoadedGltf = {
  scene: Object3D;
  animations: AnimationClip[];
};

const showcaseModels: ShowcaseModel[] = [
  {
    key: "growth-sprite",
    label: "成长精灵",
    mood: "挥手待机",
    asset: "/assets/3d/spirits/growth-sprite.gltf",
    animationNames: ["Idle", "Wave", "Yes"],
    height: 2.15,
    yOffset: 0,
  },
  {
    key: "cloudwing-sprite",
    label: "云翼精灵",
    mood: "轻飞待机",
    asset: "/assets/3d/spirits/cloudwing-sprite.gltf",
    animationNames: ["Flying", "Bite_Front"],
    height: 1.45,
    yOffset: 0.25,
  },
  {
    key: "shellbay-sprite",
    label: "贝湾精灵",
    mood: "点头待机",
    asset: "/assets/3d/spirits/shellbay-sprite.gltf",
    animationNames: ["Idle", "Dance", "Yes"],
    height: 1.25,
    yOffset: 0,
  },
];

function getShowcasePixelRatio(width: number, height: number) {
  const pixelRatio = window.devicePixelRatio || 1;
  const area = width * height;
  const cap = area >= 820_000 ? 1.25 : area >= 460_000 ? 1.35 : 1.5;
  return Math.max(1, Math.min(pixelRatio, cap));
}

function getInitialModelKey(spiritId: string): ShowcaseModelKey {
  const numericId = Number.parseInt(spiritId, 10);
  const index = Number.isFinite(numericId) ? numericId % showcaseModels.length : 0;
  return showcaseModels[index]?.key ?? "growth-sprite";
}

function disposeObject(object: Object3D) {
  object.traverse((node) => {
    const mesh = node as Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    materials.forEach((material) => disposeMaterial(material));
  });
}

function disposeMaterial(material: Material) {
  Object.values(material).forEach((value) => {
    if (value && typeof value === "object" && "isTexture" in value && value.isTexture) {
      value.dispose?.();
    }
  });
  material.dispose();
}

function chooseClip(clips: AnimationClip[], preferredNames: string[]) {
  return preferredNames
    .map((name) => clips.find((clip) => clip.name === name))
    .find((clip): clip is AnimationClip => Boolean(clip)) ?? clips[0];
}

export function SpiritShowcase3D({ child, spirit, spiritAssetUrl, onClose }: SpiritShowcase3DProps) {
  const [modelKey, setModelKey] = useState<ShowcaseModelKey>(() => getInitialModelKey(spirit.id));
  const model = useMemo(
    () => showcaseModels.find((item) => item.key === modelKey) ?? showcaseModels[0],
    [modelKey],
  );

  useEffect(() => {
    setModelKey(getInitialModelKey(spirit.id));
  }, [child.id, spirit.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="spirit-showcase-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="spirit-showcase-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${child.name} 3D 精灵展示`}
        style={{ "--showcase-accent": spirit.accent } as CSSProperties}
      >
        <header className="spirit-showcase-head">
          <span className="showcase-mark" aria-hidden="true">
            <Sparkles size={18} />
          </span>
          <div>
            <span>3D 预览</span>
            <strong>{child.name} · {spirit.name}</strong>
          </div>
          <button type="button" className="showcase-close" aria-label="关闭3D展示" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <SpiritShowcaseCanvas child={child} spirit={spirit} spiritAssetUrl={spiritAssetUrl} model={model} />

        <aside className="spirit-showcase-side" aria-label="3D展示控制">
          <div className="showcase-side-title">
            <Box size={18} />
            <div>
              <span>效果模型</span>
              <strong>{model.label}</strong>
            </div>
          </div>
          <p>{model.mood}，用于验证精灵展示间，不进入成长加分逻辑。</p>
          <div className="showcase-model-tabs" role="group" aria-label="切换3D精灵模型">
            {showcaseModels.map((item) => (
              <button
                key={item.key}
                type="button"
                className={item.key === model.key ? "active" : undefined}
                onClick={() => setModelKey(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="showcase-touch-hint">
            <Rotate3D size={16} />
            <span>触屏拖动看精灵</span>
          </div>
        </aside>
      </section>
    </div>
  );
}

function SpiritShowcaseCanvas({ child, spirit, spiritAssetUrl, model }: SpiritShowcaseCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<ShowcaseStatus>("loading");
  const [fallbackMessage, setFallbackMessage] = useState("3D 正在准备");

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let renderer: WebGLRenderer | undefined;
    let scene: Scene | undefined;
    let camera: PerspectiveCamera | undefined;
    let clock: Clock | undefined;
    let root: Object3D | undefined;
    let frameId = 0;
    let resizeObserver: ResizeObserver | undefined;
    const mixers: AnimationMixer[] = [];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setStatus("loading");
    setFallbackMessage("3D 正在准备");
    container.replaceChildren();

    const start = async () => {
      try {
        const [{ default: threeNamespace }, { GLTFLoader }] = await Promise.all([
          import("three").then((module) => ({ default: module })),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
        ]);
        const THREE = threeNamespace;
        if (disposed || !container) return;

        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = false;
        renderer.domElement.className = "spirit-showcase-canvas";
        renderer.domElement.setAttribute("aria-label", `${child.name} 的3D精灵`);
        container.appendChild(renderer.domElement);

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.set(0, 1.08, 5.2);
        camera.lookAt(0, 0.52, 0);
        clock = new THREE.Clock();

        scene.add(new THREE.HemisphereLight(0xfff6de, 0x5aa5a8, 2.7));
        const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
        keyLight.position.set(3.5, 5.5, 4.5);
        scene.add(keyLight);
        const fillLight = new THREE.PointLight(spirit.accent, 2.4, 7);
        fillLight.position.set(-2.4, 1.4, 2.2);
        scene.add(fillLight);

        const rootBaseY = -0.58;
        root = new THREE.Group();
        root.position.y = rootBaseY;
        scene.add(root);

        const platform = new THREE.Mesh(
          new THREE.CylinderGeometry(1.36, 1.46, 0.2, 48),
          new THREE.MeshStandardMaterial({
            color: 0xffefbd,
            roughness: 0.64,
            metalness: 0.04,
          }),
        );
        platform.position.y = -0.06;
        root.add(platform);

        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.52, 0.018, 8, 72),
          new THREE.MeshBasicMaterial({ color: spirit.accent }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.08;
        root.add(ring);

        const loader = new GLTFLoader();
        const [spiritGltf, chestGltf, starGltf] = await Promise.all([
          loader.loadAsync(model.asset) as Promise<LoadedGltf>,
          loader.loadAsync("/assets/3d/props/growth-chest.gltf") as Promise<LoadedGltf>,
          loader.loadAsync("/assets/3d/props/growth-star.gltf") as Promise<LoadedGltf>,
        ]);
        if (disposed || !root) {
          disposeObject(spiritGltf.scene);
          disposeObject(chestGltf.scene);
          disposeObject(starGltf.scene);
          return;
        }

        placeObject(THREE, spiritGltf.scene, model.height);
        spiritGltf.scene.position.y += model.yOffset;
        root.add(spiritGltf.scene);
        playAnimation(THREE, spiritGltf, model.animationNames, mixers);

        placeObject(THREE, chestGltf.scene, 0.58);
        chestGltf.scene.position.set(-1.18, 0.05, 0.16);
        chestGltf.scene.rotation.y = Math.PI * 0.18;
        root.add(chestGltf.scene);
        playAnimation(THREE, chestGltf, ["Chest_Open"], mixers);

        placeObject(THREE, starGltf.scene, 0.32);
        starGltf.scene.position.set(1.18, 1.08, -0.16);
        starGltf.scene.rotation.y = -Math.PI * 0.12;
        root.add(starGltf.scene);

        let pointerDown = false;
        let lastX = 0;
        let manualRotation = 0;
        const canvas = renderer.domElement;
        const onPointerDown = (event: PointerEvent) => {
          pointerDown = true;
          lastX = event.clientX;
          canvas.setPointerCapture(event.pointerId);
        };
        const onPointerMove = (event: PointerEvent) => {
          if (!pointerDown || !root) return;
          const delta = event.clientX - lastX;
          lastX = event.clientX;
          manualRotation += delta * 0.01;
          root.rotation.y += delta * 0.01;
        };
        const onPointerUp = (event: PointerEvent) => {
          pointerDown = false;
          if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
        };
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);

        const resize = () => {
          if (!renderer || !camera || !container) return;
          const width = Math.max(1, container.clientWidth);
          const height = Math.max(1, container.clientHeight);
          renderer.setPixelRatio(getShowcasePixelRatio(width, height));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        const animate = () => {
          if (disposed || !renderer || !scene || !camera || !clock || !root) return;
          const delta = clock.getDelta();
          if (!reduceMotion) {
            mixers.forEach((mixer) => mixer.update(delta));
            if (!pointerDown) root.rotation.y += delta * 0.32;
          }
          const floatOffset = reduceMotion ? 0 : Math.sin(clock.elapsedTime * 1.6) * 0.025;
          root.position.y = rootBaseY + floatOffset;
          root.rotation.z = reduceMotion ? 0 : Math.sin(clock.elapsedTime * 0.85 + manualRotation) * 0.012;
          renderer.render(scene, camera);
          frameId = window.requestAnimationFrame(animate);
        };

        setStatus("ready");
        animate();

        return () => {
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUp);
          canvas.removeEventListener("pointercancel", onPointerUp);
        };
      } catch (error) {
        if (disposed) return;
        setStatus("fallback");
        setFallbackMessage(error instanceof Error ? "这台设备暂时不能打开3D" : "3D 暂不可用");
      }
    };

    let cleanupCanvasListeners: (() => void) | undefined;
    start().then((cleanup) => {
      cleanupCanvasListeners = cleanup;
    });

    return () => {
      disposed = true;
      cleanupCanvasListeners?.();
      if (frameId) window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      if (root) disposeObject(root);
      scene?.clear();
      renderer?.dispose();
      renderer?.forceContextLoss();
      container.replaceChildren();
    };
  }, [child.name, model, spirit.accent]);

  return (
    <div className="spirit-showcase-stage" data-status={status}>
      <div ref={mountRef} className="spirit-showcase-canvas-mount" />
      {status === "loading" ? <div className="showcase-loader">3D 正在准备</div> : null}
      {status === "fallback" ? (
        <div className="showcase-fallback" role="status">
          {spiritAssetUrl ? <img src={spiritAssetUrl} alt={`${child.name} 精灵`} /> : <span>{child.name.slice(0, 1)}</span>}
          <strong>{fallbackMessage}</strong>
          <em>先用平面精灵预览</em>
        </div>
      ) : null}
    </div>
  );
}

function placeObject(
  THREE: typeof import("three"),
  object: Object3D,
  targetHeight: number,
) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 0.01);
  object.scale.setScalar(scale);
  object.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
}

function playAnimation(
  THREE: typeof import("three"),
  gltf: LoadedGltf,
  preferredNames: string[],
  mixers: AnimationMixer[],
) {
  const clip = chooseClip(gltf.animations, preferredNames);
  if (!clip) return;
  const animationMixer = new THREE.AnimationMixer(gltf.scene);
  const action = animationMixer.clipAction(clip);
  action.reset().fadeIn(0.18).play();
  mixers.push(animationMixer);
}
