import { copyFileSync, cpSync, existsSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextDir = join(webRoot, ".next");
const manifest = join(nextDir, "routes-manifest.json");
const deterministic = join(nextDir, "routes-manifest-deterministic.json");

if (existsSync(manifest) && !existsSync(deterministic)) {
  copyFileSync(manifest, deterministic);
}

const parentPkgPath = join(webRoot, "..", "package.json");
if (!existsSync(parentPkgPath)) process.exit(0);

try {
  const parent = JSON.parse(readFileSync(parentPkgPath, "utf8"));
  if (parent.name !== "bandforge-admin-root") process.exit(0);
} catch {
  process.exit(0);
}

const hoisted = join(webRoot, "..", ".next");
if (existsSync(hoisted)) {
  rmSync(hoisted, { recursive: true, force: true });
}
try {
  symlinkSync(nextDir, hoisted, "dir");
} catch {
  cpSync(nextDir, hoisted, { recursive: true });
}
