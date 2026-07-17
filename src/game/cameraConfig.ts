/**
 * [INPUT]: 不依赖运行时 Module，集中定义地图相机缩放与聚焦时间常量。
 * [OUTPUT]: 对外提供 cameraConfig 与从相机上限派生的 activityBubbleZoomThreshold。
 * [POS]: game 的相机单一配置源，被 Pixi 相机、聚焦层和标签 LOD 共同消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const cameraConfig = {
  minZoom: 0.3,
  maxZoom: 1.42,
  fullIslandZoom: 0.58,
  communityZoom: 0.9,
  homeZoom: 1.18,
  spiritZoom: 1.2,
  detailZoom: 1.24,
  focusDurationMs: 360,
};

export const activityBubbleZoomThreshold = Math.max(cameraConfig.spiritZoom, cameraConfig.maxZoom - 0.14);
