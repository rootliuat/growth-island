import { spawn } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";
const processes = [
  {
    name: "api",
    command: process.execPath,
    args: ["server/beihai-api.mjs"],
  },
  {
    name: "vite",
    command: process.execPath,
    args: ["node_modules/vite/bin/vite.js", "--host", "0.0.0.0"],
  },
];

const children = processes.map(({ name, command, args }) => {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: isWindows,
  });

  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code) => {
    if (code === 0) return;
    process.stderr.write(`[${name}] exited with code ${code}\n`);
    shutdown();
  });

  return child;
});

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
