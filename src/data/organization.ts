import { initialChildren } from "./classroom";
import type { OrganizationConfig } from "../domain/organization";

const childIds = initialChildren.map((child) => child.id);

export const organizationConfig: OrganizationConfig = {
  kindergartenName: "北海幼儿园",
  classrooms: [
    {
      id: "middle-1",
      name: "中一班",
      grade: "中班",
      childIds: childIds.slice(0, 12),
      leadTeacherIds: ["teacher-lin", "teacher-chen"],
    },
    {
      id: "middle-2",
      name: "中二班",
      grade: "中班",
      childIds: childIds.slice(12, 24),
      leadTeacherIds: ["teacher-wu", "teacher-chen"],
    },
    {
      id: "senior-1",
      name: "大一班",
      grade: "大班",
      childIds: childIds.slice(24),
      leadTeacherIds: ["teacher-zhao", "teacher-huang"],
    },
  ],
  teachers: [
    { id: "teacher-huang", name: "黄园长", role: "园长", classroomIds: ["middle-1", "middle-2", "senior-1"] },
    { id: "teacher-chen", name: "陈主任", role: "德育主任", classroomIds: ["middle-1", "middle-2"] },
    { id: "teacher-lin", name: "林老师", role: "主班老师", classroomIds: ["middle-1"] },
    { id: "teacher-wu", name: "吴老师", role: "主班老师", classroomIds: ["middle-2"] },
    { id: "teacher-zhao", name: "赵老师", role: "主班老师", classroomIds: ["senior-1"] },
  ],
  curriculumTracks: [
    {
      id: "sunshine-helper-week",
      title: "小小帮手周",
      category: "积极阳光",
      weekLabel: "第 1 周",
      status: "active",
      classroomIds: ["middle-1", "middle-2", "senior-1"],
    },
    {
      id: "rule-keeper-week",
      title: "规则守护周",
      category: "尊矩守法",
      weekLabel: "第 2 周",
      status: "planned",
      classroomIds: ["middle-1", "middle-2"],
    },
    {
      id: "innovation-lab-week",
      title: "奇想创造周",
      category: "开拓创新",
      weekLabel: "第 3 周",
      status: "planned",
      classroomIds: ["senior-1"],
    },
  ],
  growthTasks: [
    {
      id: "help-cleanup",
      title: "主动整理玩具",
      category: "积极阳光",
      xpDelta: 20,
      cadence: "weekly",
      classroomIds: ["middle-1", "middle-2", "senior-1"],
    },
    {
      id: "line-up-rule",
      title: "排队守规则",
      category: "尊矩守法",
      xpDelta: 10,
      cadence: "weekly",
      classroomIds: ["middle-1", "middle-2"],
    },
    {
      id: "brave-share",
      title: "勇敢分享一次",
      category: "勇毅有力",
      xpDelta: 20,
      cadence: "monthly",
      classroomIds: ["middle-1", "senior-1"],
    },
    {
      id: "creative-try",
      title: "提出一个新办法",
      category: "开拓创新",
      xpDelta: 30,
      cadence: "monthly",
      classroomIds: ["senior-1"],
    },
  ],
};
