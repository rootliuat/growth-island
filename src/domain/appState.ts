/**
 * [INPUT]: 不依赖运行时 Module，仅定义应用级状态契约。
 * [OUTPUT]: 对外提供 SyncStatus 类型。
 * [POS]: domain 的应用状态词汇 Module，被 App 与 QA bridge 共享。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type SyncStatus = "connecting" | "online" | "saving" | "offline";
