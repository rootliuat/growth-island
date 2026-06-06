import fs from "node:fs";
import path from "node:path";

const outputDir = path.resolve("qa-artifacts/latest");
const reportPath = path.join(outputDir, "report.json");
const oneMb = 1024 * 1024;

const defaultRequiredResults = [
  "home/whiteboard",
  "moral-speak-flow/whiteboard",
  "moral-speak-flow/mobile",
  "classroom-touch-loop/whiteboard",
  "spirit-showcase-3d/whiteboard",
  "spirit-showcase-3d/mobile",
];
const requiredResults = (process.env.TRIAL_REQUIRED_RESULTS || defaultRequiredResults.join(","))
  .split(",")
  .map((key) => key.trim())
  .filter(Boolean);

const budgets = {
  homePngCount: Number(process.env.TRIAL_HOME_PNG_COUNT_LIMIT || 10),
  homePngMb: Number(process.env.TRIAL_HOME_PNG_MB_LIMIT || 1),
  homeWebpMb: Number(process.env.TRIAL_HOME_WEBP_MB_LIMIT || 7),
  hidpiFileCount: Number(process.env.TRIAL_HIDPI_FILE_COUNT || 8),
  hidpiTotalMb: Number(process.env.TRIAL_HIDPI_MB_LIMIT || 3.5),
};

function fail(message, failures) {
  failures.push(message);
}

function readReport() {
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Missing visual QA report: ${reportPath}. Run npm run qa:trial first.`);
  }
  return JSON.parse(fs.readFileSync(reportPath, "utf8"));
}

function resultKey(result) {
  return `${result.page}/${result.viewport}`;
}

function findResult(results, key) {
  return results.find((result) => resultKey(result) === key);
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    if (!entry.isFile()) return [];
    return [fullPath];
  });
}

function summarizeHidpiRuntime() {
  const dir = path.resolve("public/assets/map/v4-runtime-hidpi/batch11");
  const files = walkFiles(dir).filter((filePath) => filePath.endsWith(".webp"));
  const bytes = files.reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0);
  return {
    dir,
    count: files.length,
    mb: Number((bytes / oneMb).toFixed(2)),
  };
}

function inspectReport(report) {
  const failures = [];
  const results = Array.isArray(report.results) ? report.results : [];

  if (report.issueCount !== 0) fail(`visual QA issueCount must be 0, got ${report.issueCount}`, failures);
  if (report.warningCount !== 0) fail(`visual QA warningCount must be 0, got ${report.warningCount}`, failures);

  for (const key of requiredResults) {
    const result = findResult(results, key);
    if (!result) {
      fail(`missing required trial QA result: ${key}`, failures);
      continue;
    }
    if (result.issues?.length) fail(`${key} has issues: ${result.issues.join("; ")}`, failures);
    if (result.warnings?.length) fail(`${key} has warnings: ${result.warnings.join("; ")}`, failures);
    if (result.common?.failedImageCount) fail(`${key} has failed images: ${result.common.failedImageCount}`, failures);
  }

  const home = findResult(results, "home/whiteboard");
  if (home) {
    const png = home.resources?.png ?? { count: 0, mb: 0 };
    const webp = home.resources?.webp ?? { count: 0, mb: 0 };
    const pixi = home.details?.pixiRenderState;
    if (png.count > budgets.homePngCount) fail(`home PNG count ${png.count} exceeds ${budgets.homePngCount}`, failures);
    if (png.mb > budgets.homePngMb) fail(`home PNG budget ${png.mb} MB exceeds ${budgets.homePngMb} MB`, failures);
    if (webp.mb > budgets.homeWebpMb) fail(`home WebP budget ${webp.mb} MB exceeds ${budgets.homeWebpMb} MB`, failures);
    if (pixi?.state === "idle" && pixi.renderResolution < 0.95) {
      fail(`home idle render resolution is too low: ${pixi.renderResolution}`, failures);
    }
  }

  for (const key of ["spirit-showcase-3d/whiteboard", "spirit-showcase-3d/mobile"].filter((item) => requiredResults.includes(item))) {
    const result = findResult(results, key);
    const showcase = result?.details?.spiritShowcase;
    if (!showcase) continue;
    if (showcase.hasFallback) fail(`${key} used PNG fallback instead of WebGL canvas`, failures);
    if (showcase.forbiddenCopy?.length) fail(`${key} has forbidden copy: ${showcase.forbiddenCopy.join(", ")}`, failures);
  }

  const hidpi = summarizeHidpiRuntime();
  if (hidpi.count !== budgets.hidpiFileCount) {
    fail(`hidpi map runtime file count ${hidpi.count} must be ${budgets.hidpiFileCount}`, failures);
  }
  if (hidpi.mb > budgets.hidpiTotalMb) {
    fail(`hidpi map runtime budget ${hidpi.mb} MB exceeds ${budgets.hidpiTotalMb} MB`, failures);
  }

  return { failures, hidpi };
}

try {
  const report = readReport();
  const { failures, hidpi } = inspectReport(report);
  const summary = {
    generatedAt: new Date().toISOString(),
    visualReportGeneratedAt: report.generatedAt,
    requiredResults,
    budgets,
    hidpi,
    ok: failures.length === 0,
    failures,
  };
  const summaryPath = path.join(outputDir, "trial-assets-report.json");
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`Trial asset QA report: ${summaryPath}`);
  console.log(`hidpi=${hidpi.count} files (${hidpi.mb} MB)`);
  if (failures.length) {
    failures.forEach((failure) => console.error(`FAIL: ${failure}`));
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
