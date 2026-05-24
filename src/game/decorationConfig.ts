import type { RegionId, WorldPoint } from "./types";

export type DecorationKind =
  | "tree"
  | "flower"
  | "rock"
  | "shell"
  | "flag"
  | "lamp"
  | "sign"
  | "pearl"
  | "mangrove"
  | "bridge"
  | "dock"
  | "fence"
  | "mailbox"
  | "windmill"
  | "scallop"
  | "street-gate";

export interface DecorationItem {
  id: string;
  kind: DecorationKind;
  regionId: RegionId;
  position: WorldPoint;
  scale?: number;
  tint?: number;
}

export const decorations: DecorationItem[] = [
  { id: "mg-01", kind: "mangrove", regionId: "mangrove", position: { x: 345, y: 552 }, scale: 1.1 },
  { id: "mg-02", kind: "mangrove", regionId: "mangrove", position: { x: 842, y: 430 }, scale: 0.9 },
  { id: "mg-03", kind: "tree", regionId: "mangrove", position: { x: 640, y: 742 }, scale: 1 },
  { id: "mg-04", kind: "bridge", regionId: "mangrove", position: { x: 610, y: 578 }, scale: 1 },
  { id: "mg-05", kind: "lamp", regionId: "mangrove", position: { x: 790, y: 704 }, scale: 0.8 },
  { id: "mg-06", kind: "fence", regionId: "mangrove", position: { x: 470, y: 720 }, scale: 0.9 },
  { id: "sh-01", kind: "shell", regionId: "shell-bay", position: { x: 430, y: 1225 }, scale: 1.1 },
  { id: "sh-02", kind: "shell", regionId: "shell-bay", position: { x: 892, y: 1008 }, scale: 0.85 },
  { id: "sh-03", kind: "sign", regionId: "shell-bay", position: { x: 608, y: 890 }, scale: 0.9 },
  { id: "sh-04", kind: "dock", regionId: "shell-bay", position: { x: 300, y: 1220 }, scale: 1 },
  { id: "sh-05", kind: "scallop", regionId: "shell-bay", position: { x: 770, y: 856 }, scale: 0.72 },
  { id: "sh-06", kind: "rock", regionId: "shell-bay", position: { x: 248, y: 1012 }, scale: 0.8 },
  { id: "pb-01", kind: "pearl", regionId: "pearl-bay", position: { x: 1635, y: 825 }, scale: 1 },
  { id: "pb-02", kind: "pearl", regionId: "pearl-bay", position: { x: 1975, y: 470 }, scale: 0.9 },
  { id: "pb-03", kind: "lamp", regionId: "pearl-bay", position: { x: 1460, y: 618 }, scale: 0.9 },
  { id: "pb-04", kind: "bridge", regionId: "pearl-bay", position: { x: 1760, y: 630 }, scale: 1.15 },
  { id: "pb-05", kind: "scallop", regionId: "pearl-bay", position: { x: 1888, y: 804 }, scale: 0.64 },
  { id: "st-01", kind: "flower", regionId: "sun-town", position: { x: 1640, y: 1210 }, scale: 1.15 },
  { id: "st-02", kind: "flag", regionId: "sun-town", position: { x: 2022, y: 972 }, scale: 1 },
  { id: "st-03", kind: "tree", regionId: "sun-town", position: { x: 1475, y: 1074 }, scale: 0.9 },
  { id: "st-04", kind: "mailbox", regionId: "sun-town", position: { x: 1855, y: 1015 }, scale: 1 },
  { id: "st-05", kind: "windmill", regionId: "sun-town", position: { x: 1610, y: 835 }, scale: 0.86 },
  { id: "st-06", kind: "fence", regionId: "sun-town", position: { x: 1740, y: 1228 }, scale: 1.05 },
  { id: "os-01", kind: "lamp", regionId: "old-street", position: { x: 760, y: 438 }, scale: 1 },
  { id: "os-02", kind: "sign", regionId: "old-street", position: { x: 1285, y: 315 }, scale: 0.9 },
  { id: "os-03", kind: "flower", regionId: "old-street", position: { x: 1110, y: 565 }, scale: 0.8 },
  { id: "os-04", kind: "street-gate", regionId: "old-street", position: { x: 1120, y: 330 }, scale: 1 },
  { id: "os-05", kind: "fence", regionId: "old-street", position: { x: 1370, y: 545 }, scale: 0.92 },
  { id: "ma-01", kind: "flag", regionId: "math-arena", position: { x: 1030, y: 1085 }, scale: 1.2 },
  { id: "ma-02", kind: "flag", regionId: "math-arena", position: { x: 1460, y: 1070 }, scale: 1.2 },
  { id: "ma-03", kind: "rock", regionId: "math-arena", position: { x: 1220, y: 1328 }, scale: 0.9 },
  { id: "ma-04", kind: "lamp", regionId: "math-arena", position: { x: 1390, y: 1285 }, scale: 0.82 },
  { id: "ma-05", kind: "scallop", regionId: "math-arena", position: { x: 1045, y: 1290 }, scale: 0.72 },
];
