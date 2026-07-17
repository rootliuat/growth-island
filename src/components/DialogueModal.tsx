/**
 * [INPUT]: 依赖 React 本地表单状态、共享孩子/评估类型和外部异步文本评估动作。
 * [OUTPUT]: 对外提供 DialogueModal，只有权威快照确认后显示结果，并明确呈现提交失败。
 * [POS]: components 的文本成长建议弹窗，与说成长语音链路共享评估结果但不拥有课堂数据。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

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
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      setResult(await onSubmit(text));
    } catch (submitError) {
      setResult(null);
      setError(submitError instanceof Error ? submitError.message : "提交未完成，请重新试一次");
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
            <p>先把今天的成长说清楚，老师再看。</p>
          </div>
        </div>

        <div className="sample-row">
          {sampleTexts.map((sample) => (
            <button key={sample} onClick={() => setText(sample)}>
              {sample}
            </button>
          ))}
        </div>

        <textarea
          id="dialogue-transcript"
          name="dialogueTranscript"
          aria-label="成长表现文本"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />

        <button className="submit-dialogue" onClick={submit} disabled={submitting}>
          <WandSparkles size={22} />
          {submitting ? "贝壳在听" : "生成贝壳建议"}
        </button>

        {error ? <p className="dialogue-submit-error" role="alert">{error}</p> : null}

        {result && (
          <div className="dialogue-result">
            <strong>{result.status === "auto_posted" ? "能量已点亮" : "请老师帮忙看"}</strong>
            <p>{result.reasonForChild}</p>
            <span>
              {result.category ?? "成长"} · {result.xpDelta > 0 ? "可点亮" : "待老师看"}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
