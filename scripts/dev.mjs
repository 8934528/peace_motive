import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");
const isWindows = process.platform === "win32";
const npxBin = isWindows ? "npx.cmd" : "npx";

let dbReadyPrinted = false;
let serverStartedPrinted = false;
let appRunningPrinted = false;
let localUrl = "http://localhost:5173";

function stripAnsi(input) {
  return input.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
}

function tryPrintAppRunning() {
  if (dbReadyPrinted && serverStartedPrinted && !appRunningPrinted && frontendReady) {
    appRunningPrinted = true;
    console.log("Application running\n");
    console.log(`Local: ${localUrl}`);
  }
}

let frontendReady = false;

const serverProc = isWindows
  ? spawn(`${npxBin} tsx watch src/server.ts`, {
      cwd: backendDir,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true
    })
  : spawn(npxBin, ["tsx", "watch", "src/server.ts"], {
      cwd: backendDir,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });

const clientProc = isWindows
  ? spawn(`${npxBin} vite --port 5173`, {
      cwd: frontendDir,
      stdio: ["ignore", "pipe", "pipe"],
      shell: true
    })
  : spawn(npxBin, ["vite", "--port", "5173"], {
      cwd: frontendDir,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });

serverProc.stdout.on("data", (chunk) => {
  const text = stripAnsi(chunk.toString());
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line === "Database ready" && !dbReadyPrinted) {
      dbReadyPrinted = true;
      console.log("Database ready");
    } else if (line === "Server started" && !serverStartedPrinted) {
      serverStartedPrinted = true;
      console.log("Server started");
    } else if (
      !line.startsWith("[tsx]") && line !== "Database ready" && line !== "Server started"
    ) {
      console.log(line);
    }
  }

  tryPrintAppRunning();
});

serverProc.stderr.on("data", (chunk) => {
  const text = stripAnsi(chunk.toString()).trim();
  if (text) {
    console.error(text);
  }
});

clientProc.stdout.on("data", (chunk) => {
  const text = stripAnsi(chunk.toString());
  const urlMatch = text.match(/http:\/\/localhost:\d+/);
  if (urlMatch) {
    localUrl = urlMatch[0];
    frontendReady = true;
    tryPrintAppRunning();
  }
});

clientProc.stderr.on("data", (chunk) => {
  const text = stripAnsi(chunk.toString()).trim();
  if (text) {
    console.error(text);
  }
});

let shuttingDown = false;
function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  serverProc.kill();
  clientProc.kill();
  process.exit(exitCode);
}

serverProc.on("exit", (code) => {
  if (!shuttingDown && code && code !== 0) {
    shutdown(code);
  }
});

clientProc.on("exit", (code) => {
  if (!shuttingDown && code && code !== 0) {
    shutdown(code);
  }
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

