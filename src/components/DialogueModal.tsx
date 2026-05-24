import { useState } from "react";
import { MessageCircle, WandSparkles, X } from "lucide-react";
import type { ChildWithProgress, MoralEvaluationResult } from "../types";

interface DialogueModalProps {
  child: ChildWithProgress;
  onClose: () => void;
  onSubmit: (text: string) => Promise<MoralEvaluationResult>;
}

const sampleTexts = [
  "我今天主动帮同学收玩具",
  "我排队的时候没有插队",
  "我刚才抢玩具了，下次我要轮流玩",
  "我坚持把积木搭完了",
];

export function DialogueModal({ child, onClose, onSubmit }: DialogueModalProps) {
  const [text, setText] = useState(sampleTexts[0]);
  const [result, setResult] = useState<MoralEvaluationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      setResult(await onSubmit(text));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <section className="dialogue-modal">
        <button className="icon-close" onClick={onClose} aria-label="关闭">
          <X size={24} />
        </button>
        <div className="modal-heading">
          <MessageCircle size={28} />
          <div>
            <h2>和 {child.petName} 说一说</h2>
            <p>当前是 mock：先用文本模拟 ASR + DeepSeek 判断</p>
          </div>
        </div>

        <div className="sample-row">
          {sampleTexts.map((sample) => (
            <button key={sample} onClick={() => setText(sample)}>
              {sample}
            </button>
          ))}
        </div>

        <textarea value={text} onChange={(event) => setText(event.target.value)} />

        <button className="submit-dialogue" onClick={submit} disabled={submitting}>
          <WandSparkles size={22} />
          {submitting ? "Agent 判断中" : "让德育 Agent 判断"}
        </button>

        {result && (
          <div className="dialogue-result">
            <strong>{result.status === "auto_posted" ? "已自动入账" : "进入复核/手动兜底"}</strong>
            <p>{result.reasonForChild}</p>
            <span>
              {result.category ?? "未分类"} · {result.xpDelta > 0 ? "+" : ""}
              {result.xpDelta} XP · {Math.round(result.confidence * 100)}%
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
