import type {
  ChildWithProgress,
  LedgerRecord,
  LedgerRecordInput,
  MoralReviewItem,
  OrganizationState,
  ParentReportReviewRecord,
  ParentReportReviewStatus,
  VirtueCategory,
} from "../types";

export type OrganizationRole = "园长" | "主班老师" | "配班老师" | "德育主任";
export type CurriculumStatus = "active" | "planned";
export type GrowthTaskCadence = "weekly" | "monthly" | "seasonal";

export interface OrganizationTeacher {
  id: string;
  name: string;
  role: OrganizationRole;
  classroomIds: string[];
}

export interface OrganizationClassroom {
  id: string;
  name: string;
  grade: string;
  childIds: string[];
  leadTeacherIds: string[];
}

export interface CurriculumTrack {
  id: string;
  title: string;
  category: VirtueCategory;
  weekLabel: string;
  status: CurriculumStatus;
  classroomIds: string[];
}

export interface CurriculumTrackRuntime extends CurriculumTrack {
  taskCount: number;
  completedTaskCount: number;
}

export interface GrowthTaskTemplate {
  id: string;
  title: string;
  category: VirtueCategory;
  xpDelta: 10 | 20 | 30;
  cadence: GrowthTaskCadence;
  classroomIds: string[];
}

export interface GrowthTaskRuntime extends GrowthTaskTemplate {
  completionCount: number;
  completedChildCount: number;
  completedChildIds: string[];
  latestCompletedAt: string;
  curriculumActive: boolean;
}

export type ActiveCurriculumByClassroomId = Record<string, string>;

export interface OrganizationConfig {
  kindergartenName: string;
  classrooms: OrganizationClassroom[];
  teachers: OrganizationTeacher[];
  curriculumTracks: CurriculumTrack[];
  growthTasks: GrowthTaskTemplate[];
}

export interface ParentReportDraft {
  id: string;
  classroomId: string;
  childId: string;
  childName: string;
  recordCount: number;
  categories: VirtueCategory[];
  latestRecordAt: string;
  status: "ready" | "needs_records";
  reviewStatus: ParentReportReviewStatus;
  reviewUpdatedAt: string;
  reviewNote?: string;
}

export interface ParentReportCategorySummary {
  category: VirtueCategory;
  recordCount: number;
  xpDelta: number;
  positiveXp: number;
  latestRecordAt: string;
}

export interface ParentReportEvidence {
  id: string;
  category?: VirtueCategory;
  delta: number;
  reason: string;
  createdAt: string;
}

export interface ParentReportTask {
  id: string;
  title: string;
  category: VirtueCategory;
  xpDelta: 10 | 20 | 30;
  cadence: GrowthTaskCadence;
}

export interface ParentReportDocument {
  id: string;
  generatedAt: string;
  kindergartenName: string;
  classroomId: string;
  classroomName: string;
  childId: string;
  childName: string;
  level: number;
  xp: number;
  recordCount: number;
  positiveXp: number;
  pendingReviewCount: number;
  categories: ParentReportCategorySummary[];
  highlights: ParentReportEvidence[];
  nextTasks: ParentReportTask[];
  teacherSummary: string;
}

export interface OrganizationClassroomRuntime extends OrganizationClassroom {
  childCount: number;
  activeRecordCount: number;
  pendingReviewCount: number;
  teachers: OrganizationTeacher[];
  curriculumTracks: CurriculumTrackRuntime[];
  growthTasks: GrowthTaskRuntime[];
  reportDrafts: ParentReportDraft[];
}

export interface OrganizationRuntime {
  kindergartenName: string;
  classrooms: OrganizationClassroomRuntime[];
  teacherCount: number;
  childCount: number;
  activeReportDraftCount: number;
  curriculumCount: number;
  growthTaskCount: number;
}

function getActiveRecordsForChild(childId: string, ledger: LedgerRecord[]) {
  return ledger
    .filter((record) => record.childId === childId && !record.undone && record.source !== "undo")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function buildParentReportDraft(
  classroomId: string,
  child: ChildWithProgress,
  records: LedgerRecord[],
  review?: ParentReportReviewRecord,
): ParentReportDraft {
  const categories = [...new Set(records.map((record) => record.category).filter((category): category is VirtueCategory => Boolean(category)))];
  return {
    id: `${classroomId}:${child.id}`,
    classroomId,
    childId: child.id,
    childName: child.name,
    recordCount: records.length,
    categories,
    latestRecordAt: records[0]?.createdAt ?? "",
    status: records.length > 0 ? "ready" : "needs_records",
    reviewStatus: review?.status ?? "draft",
    reviewUpdatedAt: review?.updatedAt ?? "",
    reviewNote: review?.note,
  };
}

function buildCategorySummary(records: LedgerRecord[]): ParentReportCategorySummary[] {
  const stats = new Map<VirtueCategory, ParentReportCategorySummary>();

  records.forEach((record) => {
    if (!record.category) return;
    const current = stats.get(record.category) ?? {
      category: record.category,
      recordCount: 0,
      xpDelta: 0,
      positiveXp: 0,
      latestRecordAt: record.createdAt,
    };
    current.recordCount += 1;
    current.xpDelta += record.delta;
    current.positiveXp += Math.max(0, record.delta);
    if (new Date(record.createdAt).getTime() > new Date(current.latestRecordAt).getTime()) {
      current.latestRecordAt = record.createdAt;
    }
    stats.set(record.category, current);
  });

  return [...stats.values()].sort((a, b) => b.recordCount - a.recordCount || b.positiveXp - a.positiveXp || a.category.localeCompare(b.category, "zh-Hans-CN"));
}

function formatEvidence(record: LedgerRecord): ParentReportEvidence {
  return {
    id: record.id,
    category: record.category,
    delta: record.delta,
    reason: record.reason,
    createdAt: record.createdAt,
  };
}

export function getGrowthTaskReason(task: Pick<GrowthTaskTemplate, "title">) {
  return `成长任务：${task.title}`;
}

function buildGrowthTaskRuntime(
  task: GrowthTaskTemplate,
  ledger: LedgerRecord[],
  childIdSet: Set<string>,
  activeCurriculumCategory?: VirtueCategory,
): GrowthTaskRuntime {
  const completions = ledger
    .filter(
      (record) =>
        childIdSet.has(record.childId) &&
        !record.undone &&
        record.source !== "undo" &&
        record.reason === getGrowthTaskReason(task),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const completedChildIds = [...new Set(completions.map((record) => record.childId))];

  return {
    ...task,
    completionCount: completions.length,
    completedChildCount: completedChildIds.length,
    completedChildIds,
    latestCompletedAt: completions[0]?.createdAt ?? "",
    curriculumActive: task.category === activeCurriculumCategory,
  };
}

export function resolveActiveCurriculumTrackId(
  config: OrganizationConfig,
  classroomId: string,
  activeCurriculumByClassroomId: ActiveCurriculumByClassroomId = {},
) {
  const classroomTracks = config.curriculumTracks.filter((track) => track.classroomIds.includes(classroomId));
  const requestedTrackId = activeCurriculumByClassroomId[classroomId];
  if (requestedTrackId && classroomTracks.some((track) => track.id === requestedTrackId)) return requestedTrackId;
  return classroomTracks.find((track) => track.status === "active")?.id ?? classroomTracks[0]?.id ?? "";
}

export function publishCurriculumTrack(
  config: OrganizationConfig,
  classroomId: string,
  trackId: string,
  current: ActiveCurriculumByClassroomId = {},
): ActiveCurriculumByClassroomId | undefined {
  const classroomExists = config.classrooms.some((classroom) => classroom.id === classroomId);
  const trackBelongsToClassroom = config.curriculumTracks.some((track) => track.id === trackId && track.classroomIds.includes(classroomId));
  if (!classroomExists || !trackBelongsToClassroom) return undefined;
  return { ...current, [classroomId]: trackId };
}

export function updateParentReportReview(
  config: OrganizationConfig,
  current: OrganizationState,
  childId: string,
  status: ParentReportReviewStatus,
  updatedAt = new Date().toISOString(),
  reviewedBy = "园所码头",
  note?: string,
): OrganizationState | undefined {
  const childExists = config.classrooms.some((classroom) => classroom.childIds.includes(childId));
  if (!childExists) return undefined;
  const record: ParentReportReviewRecord = {
    childId,
    status,
    updatedAt,
    reviewedBy,
    note,
  };
  return {
    ...current,
    activeCurriculumByClassroomId: { ...current.activeCurriculumByClassroomId },
    parentReportReviewsByChildId: {
      ...current.parentReportReviewsByChildId,
      [childId]: record,
    },
  };
}

export function createGrowthTaskLedgerInput(
  config: OrganizationConfig,
  taskId: string,
  childId: string,
  operatorChildId: string,
): LedgerRecordInput | undefined {
  const task = config.growthTasks.find((item) => item.id === taskId);
  const classroom = config.classrooms.find((item) => item.childIds.includes(childId));
  if (!task || !classroom || !task.classroomIds.includes(classroom.id)) return undefined;

  return {
    childId,
    operatorChildId,
    operatorRole: "teacher",
    delta: task.xpDelta,
    source: "manual",
    category: task.category,
    reason: getGrowthTaskReason(task),
    aiSuggested: false,
    reviewStatus: "not_required",
  };
}

export function buildParentReportDocument(
  config: OrganizationConfig,
  children: ChildWithProgress[],
  ledger: LedgerRecord[],
  reviews: MoralReviewItem[],
  childId: string,
  generatedAt = new Date().toISOString(),
): ParentReportDocument | undefined {
  const child = children.find((item) => item.id === childId);
  const classroom = config.classrooms.find((item) => item.childIds.includes(childId));
  if (!child || !classroom) return undefined;

  const records = getActiveRecordsForChild(childId, ledger);
  const categories = buildCategorySummary(records);
  const highlights = records.filter((record) => record.delta > 0).slice(0, 5).map(formatEvidence);
  const nextTasks = config.growthTasks
    .filter((task) => task.classroomIds.includes(classroom.id))
    .slice(0, 3)
    .map<ParentReportTask>((task) => ({
      id: task.id,
      title: task.title,
      category: task.category,
      xpDelta: task.xpDelta,
      cadence: task.cadence,
    }));
  const pendingReviewCount = reviews.filter((review) => review.childId === childId && review.status === "pending_review").length;
  const positiveXp = records.reduce((sum, record) => sum + Math.max(0, record.delta), 0);
  const topCategory = categories[0]?.category;

  return {
    id: `parent-report:${classroom.id}:${child.id}:${generatedAt}`,
    generatedAt,
    kindergartenName: config.kindergartenName,
    classroomId: classroom.id,
    classroomName: classroom.name,
    childId: child.id,
    childName: child.name,
    level: child.level,
    xp: child.xp,
    recordCount: records.length,
    positiveXp,
    pendingReviewCount,
    categories,
    highlights,
    nextTasks,
    teacherSummary:
      records.length > 0
        ? `${child.name}本阶段积累了 ${records.length} 条成长证据，${topCategory ? `主要能量集中在「${topCategory}」` : "已形成稳定成长记录"}。`
        : `${child.name}本阶段还没有可生成报告的成长证据，建议先完成一次课堂记录或成长任务。`,
  };
}

function formatDateTime(value: string) {
  if (!value) return "未记录时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatParentReportMarkdown(report: ParentReportDocument) {
  const categoryLines = report.categories.length
    ? report.categories.map((category) => `- ${category.category}: ${category.recordCount} 条, +${category.positiveXp} XP`).join("\n")
    : "- 暂无维度统计";
  const highlightLines = report.highlights.length
    ? report.highlights.map((record) => `- ${formatDateTime(record.createdAt)} ${record.category ?? "成长记录"} ${record.delta > 0 ? "+" : ""}${record.delta} XP: ${record.reason}`).join("\n")
    : "- 暂无成长证据";
  const taskLines = report.nextTasks.length
    ? report.nextTasks.map((task) => `- ${task.title}: ${task.category}, +${task.xpDelta} XP`).join("\n")
    : "- 暂无推荐任务";

  return [
    `# ${report.kindergartenName}${report.classroomName}${report.childName}成长报告`,
    "",
    `生成时间: ${formatDateTime(report.generatedAt)}`,
    `当前等级: Lv.${report.level}`,
    `当前 XP: ${report.xp}`,
    `成长证据: ${report.recordCount} 条`,
    `待老师复核: ${report.pendingReviewCount} 条`,
    "",
    "## 老师摘要",
    report.teacherSummary,
    "",
    "## 德育维度",
    categoryLines,
    "",
    "## 代表证据",
    highlightLines,
    "",
    "## 下阶段成长任务",
    taskLines,
    "",
  ].join("\n");
}

export function buildOrganizationRuntime(
  config: OrganizationConfig,
  children: ChildWithProgress[],
  ledger: LedgerRecord[],
  reviews: MoralReviewItem[],
  activeCurriculumByClassroomId: ActiveCurriculumByClassroomId = {},
  parentReportReviewsByChildId: OrganizationState["parentReportReviewsByChildId"] = {},
): OrganizationRuntime {
  const childById = new Map(children.map((child) => [child.id, child]));
  const classrooms = config.classrooms.map<OrganizationClassroomRuntime>((classroom) => {
    const classroomChildren = classroom.childIds.map((childId) => childById.get(childId)).filter((child): child is ChildWithProgress => Boolean(child));
    const childIdSet = new Set(classroomChildren.map((child) => child.id));
    const activeRecords = ledger.filter((record) => childIdSet.has(record.childId) && !record.undone && record.source !== "undo");
    const pendingReviewCount = reviews.filter((review) => childIdSet.has(review.childId) && review.status === "pending_review").length;
    const activeCurriculumTrackId = resolveActiveCurriculumTrackId(config, classroom.id, activeCurriculumByClassroomId);
    const activeCurriculumTrack = config.curriculumTracks.find((track) => track.id === activeCurriculumTrackId);
    const classTasks = config.growthTasks
      .filter((task) => task.classroomIds.includes(classroom.id))
      .map((task) => buildGrowthTaskRuntime(task, ledger, childIdSet, activeCurriculumTrack?.category))
      .sort((a, b) => Number(b.curriculumActive) - Number(a.curriculumActive) || a.title.localeCompare(b.title, "zh-Hans-CN"));
    const reportDrafts = classroomChildren
      .map((child) =>
        buildParentReportDraft(
          classroom.id,
          child,
          getActiveRecordsForChild(child.id, ledger),
          parentReportReviewsByChildId[child.id],
        ),
      )
      .sort((a, b) => b.recordCount - a.recordCount || a.childName.localeCompare(b.childName, "zh-Hans-CN"));

    return {
      ...classroom,
      childCount: classroomChildren.length,
      activeRecordCount: activeRecords.length,
      pendingReviewCount,
      teachers: config.teachers.filter((teacher) => teacher.classroomIds.includes(classroom.id)),
      curriculumTracks: config.curriculumTracks
        .filter((track) => track.classroomIds.includes(classroom.id))
        .map<CurriculumTrackRuntime>((track) => {
          const trackTasks = classTasks.filter((task) => task.category === track.category);
          return {
            ...track,
            status: track.id === activeCurriculumTrackId ? "active" : "planned",
            taskCount: trackTasks.length,
            completedTaskCount: trackTasks.reduce((sum, task) => sum + task.completedChildCount, 0),
          };
        }),
      growthTasks: classTasks,
      reportDrafts,
    };
  });

  return {
    kindergartenName: config.kindergartenName,
    classrooms,
    teacherCount: config.teachers.length,
    childCount: classrooms.reduce((sum, classroom) => sum + classroom.childCount, 0),
    activeReportDraftCount: classrooms.reduce((sum, classroom) => sum + classroom.reportDrafts.filter((draft) => draft.status === "ready").length, 0),
    curriculumCount: config.curriculumTracks.length,
    growthTaskCount: config.growthTasks.length,
  };
}

export function validateOrganizationConfig(config: OrganizationConfig) {
  const classroomIds = new Set(config.classrooms.map((classroom) => classroom.id));
  const teacherIds = new Set(config.teachers.map((teacher) => teacher.id));
  const invalidTeacherLinks = config.classrooms.flatMap((classroom) =>
    classroom.leadTeacherIds.filter((teacherId) => !teacherIds.has(teacherId)).map((teacherId) => `${classroom.id}:${teacherId}`),
  );
  const invalidClassLinks = [
    ...config.teachers.flatMap((teacher) => teacher.classroomIds.filter((classroomId) => !classroomIds.has(classroomId)).map((classroomId) => `${teacher.id}:${classroomId}`)),
    ...config.curriculumTracks.flatMap((track) => track.classroomIds.filter((classroomId) => !classroomIds.has(classroomId)).map((classroomId) => `${track.id}:${classroomId}`)),
    ...config.growthTasks.flatMap((task) => task.classroomIds.filter((classroomId) => !classroomIds.has(classroomId)).map((classroomId) => `${task.id}:${classroomId}`)),
  ];

  return {
    classroomCount: config.classrooms.length,
    teacherCount: config.teachers.length,
    valid: invalidTeacherLinks.length === 0 && invalidClassLinks.length === 0,
    invalidTeacherLinks,
    invalidClassLinks,
  };
}
