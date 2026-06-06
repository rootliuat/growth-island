import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export type Spirit3DModelKey = "growth-sprite" | "cloudwing-sprite" | "shellbay-sprite";
export type Reward3DModelKey = "growth-chest" | "growth-star" | "growth-gem";
type StageStatus = "loading" | "ready" | "fallback";

interface Spirit3DModel {
  key: Spirit3DModelKey;
  label: string;
  mood: string;
  asset: string;
  animationNames: string[];
  height: number;
  yOffset: number;
}

interface Reward3DModel {
  key: Reward3DModelKey;
  label: string;
  asset: string;
  animationNames: string[];
  height: number;
  yOffset: number;
}

interface BaseStageProps {
  accent: string;
  className?: string;
  canvasClassName?: string;
  fallbackImageUrl?: string;
  fallbackInitial?: string;
  fallbackTitle?: string;
  fallbackDetail?: string;
  hideFallback?: boolean;
  interactive?: boolean;
  size?: "compact" | "medium" | "large";
}

interface SpiritModelStage3DProps extends BaseStageProps {
  child: ChildWithProgress;
  spirit: SpiritDefinition;
  modelKey?: Spirit3DModelKey;
  withDecor?: boolean;
}

interface RewardModelPreview3DProps extends BaseStageProps {
  modelKey: Reward3DModelKey;
  label?: string;
  motion?: "idle" | "success";
}

type LoadedGltf = {
  scene: Object3D;
  animations: AnimationClip[];
};

export const spirit3dModels: Spirit3DModel[] = [
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

export const reward3dModels: Reward3DModel[] = [
  {
    key: "growth-chest",
    label: "成长宝箱",
    asset: "/assets/3d/props/growth-chest.gltf",
    animationNames: ["Chest_Open"],
    height: 1.05,
    yOffset: 0,
  },
  {
    key: "growth-star",
    label: "成长星光",
    asset: "/assets/3d/props/growth-star.gltf",
    animationNames: [],
    height: 0.86,
    yOffset: 0.08,
  },
  {
    key: "growth-gem",
    label: "能量宝石",
    asset: "/assets/3d/props/growth-gem.gltf",
    animationNames: [],
    height: 0.78,
    yOffset: 0.06,
  },
];

function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

export function getInitialSpirit3DModelKey(spiritId: string): Spirit3DModelKey {
  const numericId = Number.parseInt(spiritId, 10);
  const index = Number.isFinite(numericId) ? numericId % spirit3dModels.length : 0;
  return spirit3dModels[index]?.key ?? "growth-sprite";
}

export function getReward3DModelKeyForReward(rewardId?: string, category?: string): Reward3DModelKey {
  const value = `${rewardId ?? ""} ${category ?? ""}`;
  if (/星|荣誉|称号|展示/.test(value)) return "growth-star";
  if (/材料|创作|宝石|能量/.test(value)) return "growth-gem";
  return "growth-chest";
}

function getShowcasePixelRatio(width: number, height: number) {
  const pixelRatio = window.devicePixelRatio || 1;
  const area = width * height;
  const cap = area >= 820_000 ? 1.25 : area >= 460_000 ? 1.35 : 1.5;
  return Math.max(1, Math.min(pixelRatio, cap));
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
  return (
    preferredNames
      .map((name) => clips.find((clip) => clip.name === name))
      .find((clip): clip is AnimationClip => Boolean(clip)) ?? clips[0]
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

function StageFallback({
  imageUrl,
  initial,
  title,
  detail,
}: {
  imageUrl?: string;
  initial?: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="model-stage-fallback showcase-fallback" role="status">
      {imageUrl ? <img src={imageUrl} alt="" /> : <span>{initial ?? "光"}</span>}
      <strong>{title}</strong>
      <em>{detail}</em>
    </div>
  );
}

export function SpiritModelStage3D({
  child,
  spirit,
  modelKey,
  withDecor = true,
  accent,
  className,
  canvasClassName,
  fallbackImageUrl,
  fallbackInitial,
  fallbackTitle = "这台设备暂时不能打开3D",
  fallbackDetail = "先用平面精灵预览",
  hideFallback = false,
  interactive = true,
  size = "large",
}: SpiritModelStage3DProps) {
  const model = useMemo(
    () => spirit3dModels.find((item) => item.key === (modelKey ?? getInitialSpirit3DModelKey(spirit.id))) ?? spirit3dModels[0],
    [modelKey, spirit.id],
  );
  const stageClassName = classNames("model-stage-3d", `model-stage-${size}`, "model-stage-spirit", className);
  const setupScene = useCallback(
    async ({ THREE, root, loader, mixers }: ThreeStageContext) => {
      const loads: Array<Promise<LoadedGltf>> = [loader.loadAsync(model.asset) as Promise<LoadedGltf>];
      if (withDecor) {
        loads.push(
          loader.loadAsync("/assets/3d/props/growth-chest.gltf") as Promise<LoadedGltf>,
          loader.loadAsync("/assets/3d/props/growth-star.gltf") as Promise<LoadedGltf>,
        );
      }
      const [spiritGltf, chestGltf, starGltf] = await Promise.all(loads);
      placeObject(THREE, spiritGltf.scene, model.height);
      spiritGltf.scene.position.y += model.yOffset;
      root.add(spiritGltf.scene);
      playAnimation(THREE, spiritGltf, model.animationNames, mixers);

      if (chestGltf) {
        placeObject(THREE, chestGltf.scene, 0.58);
        chestGltf.scene.position.set(-1.18, 0.05, 0.16);
        chestGltf.scene.rotation.y = Math.PI * 0.18;
        root.add(chestGltf.scene);
        playAnimation(THREE, chestGltf, ["Chest_Open"], mixers);
      }

      if (starGltf) {
        placeObject(THREE, starGltf.scene, 0.32);
        starGltf.scene.position.set(1.18, 1.08, -0.16);
        starGltf.scene.rotation.y = -Math.PI * 0.12;
        root.add(starGltf.scene);
      }
    },
    [model, withDecor],
  );

  return (
    <ThreeStage
      stageClassName={stageClassName}
      canvasClassName={canvasClassName}
      accent={accent}
      interactive={interactive}
      fallback={{
        imageUrl: fallbackImageUrl,
        initial: fallbackInitial ?? child.name.slice(0, 1),
        title: fallbackTitle,
        detail: fallbackDetail,
        hide: hideFallback,
      }}
      setupScene={setupScene}
    />
  );
}

export function RewardModelPreview3D({
  modelKey,
  label,
  motion = "idle",
  accent,
  className,
  canvasClassName,
  fallbackImageUrl,
  fallbackInitial = "光",
  fallbackTitle,
  fallbackDetail = "用平面奖励预览",
  hideFallback = false,
  interactive = false,
  size = "compact",
}: RewardModelPreview3DProps) {
  const model = useMemo(
    () => reward3dModels.find((item) => item.key === modelKey) ?? reward3dModels[0],
    [modelKey],
  );
  const stageClassName = classNames(
    "model-stage-3d",
    `model-stage-${size}`,
    "model-stage-reward",
    motion === "success" && "is-success",
    className,
  );
  const setupScene = useCallback(
    async ({ THREE, root, loader, mixers }: ThreeStageContext) => {
      const gltf = await loader.loadAsync(model.asset) as LoadedGltf;
      placeObject(THREE, gltf.scene, model.height);
      gltf.scene.position.y += model.yOffset;
      root.add(gltf.scene);
      playAnimation(THREE, gltf, model.animationNames, mixers);
    },
    [model],
  );

  return (
    <ThreeStage
      stageClassName={stageClassName}
      canvasClassName={canvasClassName}
      accent={accent}
      interactive={interactive}
      fallback={{
        imageUrl: fallbackImageUrl,
        initial: fallbackInitial,
        title: fallbackTitle ?? label ?? model.label,
        detail: fallbackDetail,
        hide: hideFallback,
      }}
      setupScene={setupScene}
    />
  );
}

interface ThreeStageContext {
  THREE: typeof import("three");
  root: Object3D;
  loader: { loadAsync: (url: string) => Promise<unknown> };
  mixers: AnimationMixer[];
}

interface ThreeStageProps {
  stageClassName: string;
  canvasClassName?: string;
  accent: string;
  interactive: boolean;
  fallback: {
    imageUrl?: string;
    initial?: string;
    title: string;
    detail: string;
    hide?: boolean;
  };
  setupScene: (context: ThreeStageContext) => Promise<void>;
}

function ThreeStage({ stageClassName, canvasClassName, accent, interactive, fallback, setupScene }: ThreeStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<StageStatus>("loading");

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
        renderer.domElement.className = classNames("model-stage-canvas", canvasClassName);
        renderer.domElement.setAttribute("aria-label", "3D 成长模型");
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
        const fillLight = new THREE.PointLight(accent, 2.4, 7);
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
          new THREE.MeshBasicMaterial({ color: accent }),
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.08;
        root.add(ring);

        const loader = new GLTFLoader();
        await setupScene({ THREE, root, loader, mixers });
        if (disposed || !root) return;

        let pointerDown = false;
        let lastX = 0;
        let manualRotation = 0;
        const canvas = renderer.domElement;
        const onPointerDown = (event: PointerEvent) => {
          if (!interactive) return;
          pointerDown = true;
          lastX = event.clientX;
          canvas.setPointerCapture(event.pointerId);
        };
        const onPointerMove = (event: PointerEvent) => {
          if (!interactive || !pointerDown || !root) return;
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
      } catch {
        if (disposed) return;
        setStatus("fallback");
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
  }, [accent, canvasClassName, interactive, setupScene]);

  return (
    <div className={stageClassName} data-status={status} style={{ "--model-accent": accent } as CSSProperties}>
      <div ref={mountRef} className="model-stage-canvas-mount spirit-showcase-canvas-mount" />
      {status === "loading" ? <div className="model-stage-loader showcase-loader">3D 正在准备</div> : null}
      {status === "fallback" && !fallback.hide ? (
        <StageFallback
          imageUrl={fallback.imageUrl}
          initial={fallback.initial}
          title={fallback.title}
          detail={fallback.detail}
        />
      ) : null}
    </div>
  );
}
