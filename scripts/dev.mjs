import { spawn } from "node:child_process";
import process from "node:process";

function run(name, cmd, args, cwd) {
  const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: true });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`[dev] ${name} exited with code ${code}`);
    }
  });
  return child;
}

const root = new URL("..", import.meta.url).pathname;
const backendCwd = decodeURIComponent(`${root}/backend`.replaceAll("//", "/"));
const frontendCwd = decodeURIComponent(`${root}/frontend`.replaceAll("//", "/"));

console.log("[dev] starting backend + frontend...");
const backend = run("backend", "npm", ["run", "dev"], backendCwd);
const frontend = run("frontend", "npm", ["run", "dev"], frontendCwd);

function shutdown() {
  backend.kill("SIGTERM");
  frontend.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

