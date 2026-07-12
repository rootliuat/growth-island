# browser/
> L2 | 父级: /src/CLAUDE.md

成员清单
appStorage.ts: 浏览器 localStorage Adapter，负责 App 启动状态、课堂备份、本地权威来源和设置读写。
moralRecorder.ts: 浏览器麦克风录音 Adapter，优先腾讯兼容格式并把 WebM 转为 16kHz 单声道 PCM WAV。

法则: 浏览器能力集中在 browser/；domain 不直接触碰 window、localStorage、MediaRecorder。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
