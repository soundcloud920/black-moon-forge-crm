import { mkdir, readFile, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = join(root, "data");
const logPath = join(dataDir, "events.jsonl");

export async function appendEvent(event) {
  await mkdir(dataDir, { recursive: true });
  const normalized = {
    id: event.id || crypto.randomUUID(),
    at: event.at || new Date().toISOString(),
    platform: event.platform,
    chat: event.chat || "",
    authorExternalId: event.authorExternalId || "",
    authorName: event.authorName || "",
    text: event.text || "",
    rawType: event.rawType || "message",
  };
  await appendFile(logPath, `${JSON.stringify(normalized)}\n`, "utf8");
  return normalized;
}

export async function readEvents() {
  try {
    const text = await readFile(logPath, "utf8");
    return text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .reverse();
  } catch {
    return [];
  }
}
