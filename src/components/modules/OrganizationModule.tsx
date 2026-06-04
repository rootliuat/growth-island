import { useMemo, useRef, useState } from "react";
import { BookOpenCheck, Home, MapPin, School, Sparkles, Users } from "lucide-react";
import { organizationConfig } from "../../data/organization";
import { buildOrganizationRuntime, type ActiveCurriculumByClassroomId } from "../../domain/organization";
import type { ChildWithProgress, LedgerRecord, MoralReviewItem } from "../../types";
import type { OrganizationState } from "../../types";

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
}

const cadenceLabels = {
  weekly: "每周",
  monthly: "每月",
  seasonal: "学期",
};

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
  const [selectedTaskChildId, setSelectedTaskChildId] = useState(selectedChild.id);
  const [completedTaskNotice, setCompletedTaskNotice] = useState("");
  const [curriculumNotice, setCurriculumNotice] = useState("");
  const completedTaskLockRef = useRef(new Set<string>());
  const classChildren = childrenWithProgress.filter((child) => selectedClassroom?.childIds.includes(child.id));
  const activeTaskChildId = selectedClassroom?.childIds.includes(selectedTaskChildId) ? selectedTaskChildId : classChildren[0]?.id;
  const activeTaskChild = childrenWithProgress.find((child) => child.id === activeTaskChildId);
  const activeTrack = selectedClassroom?.curriculumTracks.find((track) => track.status === "active");
  const activeTaskCount = selectedClassroom?.growthTasks.filter((task) => task.curriculumActive).length ?? 0;

  const completeGrowthTask = (taskId: string, taskTitle: string) => {
    if (!activeTaskChildId) return;
    const taskKey = `${activeTaskChildId}:${taskId}`;
    const taskAlreadyCompleted = selectedClassroom.growthTasks.some((task) => task.id === taskId && task.completedChildIds.includes(activeTaskChildId));
    if (taskAlreadyCompleted || completedTaskLockRef.current.has(taskKey)) return;
    completedTaskLockRef.current.add(taskKey);
    onCompleteGrowthTask(activeTaskChildId, taskId);
    setCompletedTaskNotice(`${activeTaskChild?.name ?? "孩子"}已完成「${taskTitle}」`);
  };

  const publishTrack = (trackId: string, trackTitle: string) => {
    if (!onPublishCurriculumTrack(selectedClassroom.id, trackId)) return;
    setCurriculumNotice(`${selectedClassroom.name}已启航「${trackTitle}」`);
  };

  return (
    <section className="module-page organization-page" aria-labelledby="organization-title">
      <div className="organization-header module-compact-header">
        <div>
          <span className="module-eyebrow">
            <School size={18} />
            码头
          </span>
          <h1 id="organization-title">班级码头</h1>
          <div className="organization-header-chips" aria-label="当前码头状态">
            <span>{selectedClassroom.name}</span>
            <span>{activeTaskCount} 当前任务</span>
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
          <span>任务</span>
          <strong>{runtime.growthTaskCount}</strong>
        </article>
        <article>
          <span>航线</span>
          <strong>{runtime.curriculumCount}</strong>
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
                  setSelectedTaskChildId(classroom.childIds[0] ?? selectedChild.id);
                  setCurriculumNotice("");
                  setCompletedTaskNotice("");
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
                <span>当前任务</span>
                <strong>{activeTaskCount}</strong>
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

        <section className="organization-report-panel" aria-label="孩子任务对象">
          <div className="organization-panel-title">
            <Users size={18} />
            <strong>孩子任务对象</strong>
            <span>{classChildren.length} 名孩子</span>
          </div>
          <div className="organization-report-list">
            {classChildren.map((child) => {
              const completedCount = selectedClassroom.growthTasks.filter((task) => task.completedChildIds.includes(child.id)).length;
              return (
              <button
                key={child.id}
                type="button"
                className={child.id === activeTaskChildId ? "active" : undefined}
                aria-pressed={child.id === activeTaskChildId}
                onClick={() => setSelectedTaskChildId(child.id)}
              >
                <strong>{child.name}</strong>
                <span>Lv.{child.level} · {child.xp} 能量</span>
                <em>
                  {completedCount}/{selectedClassroom.growthTasks.length} 个任务已完成
                </em>
              </button>
              );
            })}
          </div>
          {activeTaskChild ? (
            <div className="organization-report-preview" aria-label="成长航海日志">
              <div>
                <span>当前孩子</span>
                <strong>{activeTaskChild.name} 的任务板</strong>
                <em>
                  Lv.{activeTaskChild.level} · {activeTaskChild.xp} 能量 · {activeTrack?.title ?? "未启航"}
                </em>
              </div>
              <p>先选孩子，再点下面的今日任务。完成后能量直接记入精灵。</p>
              <div className="organization-report-actions">
                <button type="button" onClick={() => onFocusChild(activeTaskChild.id)}>
                  <MapPin size={16} />
                  看精灵
                </button>
              </div>
            </div>
          ) : (
            <p className="organization-empty">先在班级里选择一个孩子</p>
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
              const taskAlreadyCompleted = Boolean(activeTaskChildId && task.completedChildIds.includes(activeTaskChildId));
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
                  <button type="button" disabled={!activeTaskChildId || taskAlreadyCompleted} onClick={() => completeGrowthTask(task.id, task.title)}>
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
