import { useMemo, useRef, useState } from "react";
import { BookOpenCheck, CheckCircle2, ClipboardList, Download, Home, MapPin, RotateCcw, School, Send, Sparkles, Users } from "lucide-react";
import { organizationConfig } from "../../data/organization";
import {
  buildOrganizationRuntime,
  buildParentReportDocument,
  formatParentReportMarkdown,
  type ActiveCurriculumByClassroomId,
} from "../../domain/organization";
import type { ChildWithProgress, LedgerRecord, MoralReviewItem } from "../../types";
import type { OrganizationState, ParentReportReviewStatus } from "../../types";

interface OrganizationModuleProps {
  childrenWithProgress: ChildWithProgress[];
  ledger: LedgerRecord[];
  moralReviews: MoralReviewItem[];
  selectedChild: ChildWithProgress;
  activeCurriculumByClassroomId: ActiveCurriculumByClassroomId;
  parentReportReviewsByChildId: OrganizationState["parentReportReviewsByChildId"];
  onFocusChild: (childId: string) => void;
  onCompleteGrowthTask: (childId: string, taskId: string) => void;
  onPublishCurriculumTrack: (classroomId: string, trackId: string) => boolean;
  onUpdateParentReportReview: (childId: string, status: ParentReportReviewStatus, note?: string) => boolean;
}

const cadenceLabels = {
  weekly: "每周",
  monthly: "每月",
  seasonal: "学期",
};

const reportReviewLabels: Record<ParentReportReviewStatus, string> = {
  draft: "待提交",
  submitted: "审核中",
  approved: "已通过",
  revision_requested: "需修改",
};

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function OrganizationModule({
  childrenWithProgress,
  ledger,
  moralReviews,
  selectedChild,
  activeCurriculumByClassroomId,
  parentReportReviewsByChildId,
  onFocusChild,
  onCompleteGrowthTask,
  onPublishCurriculumTrack,
  onUpdateParentReportReview,
}: OrganizationModuleProps) {
  const runtime = useMemo(
    () =>
      buildOrganizationRuntime(
        organizationConfig,
        childrenWithProgress,
        ledger,
        moralReviews,
        activeCurriculumByClassroomId,
        parentReportReviewsByChildId,
      ),
    [activeCurriculumByClassroomId, childrenWithProgress, ledger, moralReviews, parentReportReviewsByChildId],
  );
  const [selectedClassroomId, setSelectedClassroomId] = useState(runtime.classrooms[0]?.id ?? "");
  const selectedClassroom = runtime.classrooms.find((classroom) => classroom.id === selectedClassroomId) ?? runtime.classrooms[0];
  const [selectedReportChildId, setSelectedReportChildId] = useState(selectedClassroom?.reportDrafts[0]?.childId ?? selectedChild.id);
  const [completedTaskNotice, setCompletedTaskNotice] = useState("");
  const [curriculumNotice, setCurriculumNotice] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const completedTaskLockRef = useRef(new Set<string>());
  const activeReportChildId = selectedClassroom?.reportDrafts.some((report) => report.childId === selectedReportChildId)
    ? selectedReportChildId
    : selectedClassroom?.reportDrafts[0]?.childId;
  const activeReportDraft = selectedClassroom?.reportDrafts.find((report) => report.childId === activeReportChildId);
  const activeTaskChild = childrenWithProgress.find((child) => child.id === activeReportChildId);
  const activeTrack = selectedClassroom?.curriculumTracks.find((track) => track.status === "active");
  const selectedPendingReportCount =
    selectedClassroom?.reportDrafts.filter((report) => report.status === "ready" && report.reviewStatus !== "approved").length ?? 0;
  const activeTaskCount = selectedClassroom?.growthTasks.filter((task) => task.curriculumActive).length ?? 0;
  const selectedReportDocument = useMemo(
    () =>
      activeReportChildId
        ? buildParentReportDocument(organizationConfig, childrenWithProgress, ledger, moralReviews, activeReportChildId)
        : undefined,
    [activeReportChildId, childrenWithProgress, ledger, moralReviews],
  );

  const exportParentReport = () => {
    if (!selectedReportDocument) return;
    downloadTextFile(
      `beihai-parent-report-${selectedReportDocument.classroomName}-${selectedReportDocument.childName}.md`,
      formatParentReportMarkdown(selectedReportDocument),
    );
  };

  const completeGrowthTask = (taskId: string, taskTitle: string) => {
    if (!activeReportChildId) return;
    const taskKey = `${activeReportChildId}:${taskId}`;
    const taskAlreadyCompleted = selectedClassroom.growthTasks.some((task) => task.id === taskId && task.completedChildIds.includes(activeReportChildId));
    if (taskAlreadyCompleted || completedTaskLockRef.current.has(taskKey)) return;
    completedTaskLockRef.current.add(taskKey);
    onCompleteGrowthTask(activeReportChildId, taskId);
    setCompletedTaskNotice(`${activeTaskChild?.name ?? "孩子"}已完成「${taskTitle}」`);
  };

  const publishTrack = (trackId: string, trackTitle: string) => {
    if (!onPublishCurriculumTrack(selectedClassroom.id, trackId)) return;
    setCurriculumNotice(`${selectedClassroom.name}已启航「${trackTitle}」`);
  };

  const updateReportReview = (status: ParentReportReviewStatus, message: string, note?: string) => {
    if (!activeReportChildId || !onUpdateParentReportReview(activeReportChildId, status, note)) return;
    setReportNotice(message);
  };

  return (
    <section className="module-page organization-page" aria-labelledby="organization-title">
      <div className="organization-header">
        <div>
          <span className="module-eyebrow">
            <School size={18} />
            园所码头
          </span>
          <h1 id="organization-title">班级码头</h1>
          <div className="organization-header-chips" aria-label="当前码头状态">
            <span>{selectedClassroom.name}</span>
            <span>{selectedPendingReportCount} 待巡检</span>
            <span>{activeTrack?.title ?? "未启航"}</span>
          </div>
        </div>
        <button type="button" className="organization-home-button" onClick={() => onFocusChild(selectedChild.id)}>
          <Home size={18} />
          回岛
        </button>
      </div>

      <div className="organization-summary" aria-label="园所总览">
        <article>
          <span>码头</span>
          <strong>{runtime.kindergartenName}</strong>
        </article>
        <article>
          <span>泊位</span>
          <strong>{runtime.classrooms.length}</strong>
        </article>
        <article>
          <span>船员</span>
          <strong>{runtime.teacherCount}</strong>
        </article>
        <article>
          <span>待巡检</span>
          <strong>{runtime.activeReportDraftCount}</strong>
        </article>
        <article>
          <span>航线 / 任务</span>
          <strong>
            {runtime.curriculumCount} / {runtime.growthTaskCount}
          </strong>
        </article>
      </div>

      <div className="organization-layout">
        <aside className="organization-class-panel" aria-label="班级泊位">
          <div className="organization-panel-title">
            <Users size={18} />
            <strong>班级泊位</strong>
          </div>
          <div className="organization-class-list">
            {runtime.classrooms.map((classroom) => (
              <button
                key={classroom.id}
                type="button"
                className={classroom.id === selectedClassroom.id ? "active" : undefined}
                aria-pressed={classroom.id === selectedClassroom.id}
                onClick={() => {
                  setSelectedClassroomId(classroom.id);
                  setCurriculumNotice("");
                  setCompletedTaskNotice("");
                  setReportNotice("");
                }}
              >
                <span>{classroom.grade}</span>
                <strong>{classroom.name}</strong>
                <em>
                  {classroom.childCount} 名成员 · {classroom.teachers.length} 位船员
                </em>
              </button>
            ))}
          </div>
        </aside>

        <section className="organization-classroom-panel" aria-label="班级船坞">
          <div className="organization-panel-title">
            <School size={18} />
            <strong>{selectedClassroom.name} 船员协作</strong>
          </div>
          <div className="organization-classroom-metrics">
            <article>
              <span>小岛成员</span>
              <strong>{selectedClassroom.childCount}</strong>
            </article>
            <article>
              <span>成长贝壳</span>
              <strong>{selectedClassroom.activeRecordCount}</strong>
            </article>
            <article>
              <span>待巡检</span>
              <strong>{selectedClassroom.pendingReviewCount}</strong>
            </article>
          </div>
          <div className="organization-teacher-list" aria-label="教师船员">
            {selectedClassroom.teachers.map((teacher) => (
              <article key={teacher.id}>
                <span>{teacher.role}</span>
                <strong>{teacher.name}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="organization-report-panel" aria-label="报告巡检台">
          <div className="organization-panel-title">
            <ClipboardList size={18} />
            <strong>报告巡检台</strong>
            <span>{selectedPendingReportCount} 待巡检</span>
          </div>
          <div className="organization-report-list">
            {selectedClassroom.reportDrafts.map((report) => (
              <button
                key={report.id}
                type="button"
                className={report.childId === activeReportChildId ? "active" : undefined}
                aria-pressed={report.childId === activeReportChildId}
                onClick={() => setSelectedReportChildId(report.childId)}
              >
                <strong>{report.childName}</strong>
                <span>{report.status === "ready" ? reportReviewLabels[report.reviewStatus] : "待收集"}</span>
                <em>
                  {report.recordCount} 条证据 · {report.categories.slice(0, 2).join(" / ") || "暂无维度"}
                </em>
              </button>
            ))}
          </div>
          {selectedReportDocument ? (
            <div className="organization-report-preview" aria-label="成长航海日志">
              <div>
                <span>成长航海日志</span>
                <strong>{selectedReportDocument.childName}成长家书</strong>
                <em>
                  Lv.{selectedReportDocument.level} · {selectedReportDocument.xp} XP · {selectedReportDocument.recordCount} 条证据 ·{" "}
                  {reportReviewLabels[activeReportDraft?.reviewStatus ?? "draft"]}
                </em>
              </div>
              <p>{selectedReportDocument.teacherSummary}</p>
              {activeReportDraft?.reviewNote ? <p className="organization-report-notice">补证提示：{activeReportDraft.reviewNote}</p> : null}
              <div className="organization-category-list" aria-label="德育维度摘要">
                {selectedReportDocument.categories.slice(0, 3).map((category) => (
                  <span key={category.category}>
                    {category.category} · {category.recordCount} 条
                  </span>
                ))}
              </div>
              <div className="organization-evidence-list" aria-label="代表证据">
                {selectedReportDocument.highlights.slice(0, 2).map((record) => (
                  <article key={record.id}>
                    <strong>{record.category ?? "成长记录"}</strong>
                    <span>
                      {record.delta > 0 ? "+" : ""}
                      {record.delta} XP
                    </span>
                    <em>{record.reason}</em>
                  </article>
                ))}
              </div>
              <div className="organization-report-actions">
                <button
                  type="button"
                  disabled={selectedReportDocument.recordCount === 0 || activeReportDraft?.reviewStatus === "submitted" || activeReportDraft?.reviewStatus === "approved"}
                  onClick={() => updateReportReview("submitted", `${selectedReportDocument.childName}家书已送去巡检`)}
                >
                  <Send size={16} />
                  送去巡检
                </button>
                <button
                  type="button"
                  disabled={activeReportDraft?.reviewStatus !== "submitted"}
                  onClick={() => updateReportReview("approved", `${selectedReportDocument.childName}家书已盖章通过`)}
                >
                  <CheckCircle2 size={16} />
                  盖章通过
                </button>
                <button
                  type="button"
                  disabled={activeReportDraft?.reviewStatus !== "submitted"}
                  onClick={() => updateReportReview("revision_requested", `${selectedReportDocument.childName}家书已退回补证`, "请补充一条近期家庭可读的代表证据")}
                >
                  <RotateCcw size={16} />
                  退回补证
                </button>
                <button type="button" onClick={exportParentReport}>
                  <Download size={16} />
                  导出家书
                </button>
                <button type="button" onClick={() => onFocusChild(selectedReportDocument.childId)}>
                  <MapPin size={16} />
                  看精灵
                </button>
              </div>
              {reportNotice ? (
                <p className="organization-report-notice" role="status" aria-live="polite">
                  {reportNotice}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="organization-empty">码头还没有可巡检的家书</p>
          )}
        </section>

        <section className="organization-curriculum-panel" aria-label="课程航线">
          <div className="organization-panel-title">
            <BookOpenCheck size={18} />
            <strong>课程航线</strong>
            <span>{activeTrack?.title ?? "待启航"}</span>
          </div>
          <div className="organization-track-list">
            {selectedClassroom.curriculumTracks.map((track) => (
              <article key={track.id} className={track.status === "active" ? "active" : undefined}>
                <span>{track.weekLabel}</span>
                <strong>{track.title}</strong>
                <em>
                  {track.category} · {track.taskCount} 个任务
                </em>
                <small>{track.status === "active" ? "当前航线" : "待启航"}</small>
                <button type="button" disabled={track.status === "active"} onClick={() => publishTrack(track.id, track.title)}>
                  {track.status === "active" ? "已启航" : "启航本周"}
                </button>
              </article>
            ))}
          </div>
          {curriculumNotice ? (
            <p className="organization-curriculum-notice" role="status" aria-live="polite">
              {curriculumNotice}
            </p>
          ) : null}
        </section>

        <section className="organization-task-panel" aria-label="今日任务板">
          <div className="organization-panel-title">
            <Sparkles size={18} />
            <strong>今日任务板</strong>
            <span>{activeTaskCount} 个航线任务</span>
          </div>
          <div className="organization-task-list">
            {selectedClassroom.growthTasks.map((task) => {
              const taskAlreadyCompleted = Boolean(activeReportChildId && task.completedChildIds.includes(activeReportChildId));
              return (
                <article key={task.id} className={taskAlreadyCompleted ? "active" : undefined}>
                  <span>{cadenceLabels[task.cadence]}</span>
                  <strong>{task.title}</strong>
                  <em>
                    {task.category} · +{task.xpDelta} XP
                  </em>
                  <small>
                    {task.curriculumActive ? "当前航线任务 · " : ""}
                    {task.completedChildCount}/{selectedClassroom.childCount} 名已完成
                  </small>
                  <button type="button" disabled={!activeReportChildId || taskAlreadyCompleted} onClick={() => completeGrowthTask(task.id, task.title)}>
                    {taskAlreadyCompleted ? `${activeTaskChild?.name ?? "孩子"}已完成` : `给${activeTaskChild?.name ?? "孩子"}完成`}
                  </button>
                </article>
              );
            })}
          </div>
          {completedTaskNotice ? (
            <p className="organization-task-notice" role="status" aria-live="polite">
              {completedTaskNotice}
            </p>
          ) : null}
        </section>
      </div>
    </section>
  );
}
