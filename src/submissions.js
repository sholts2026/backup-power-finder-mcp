import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

export function loadSubmission(appId) {
  const submissions = JSON.parse(readFileSync(join(rootDir, "data", "app-submissions.json"), "utf8"));
  return submissions[appId] ?? null;
}
