import path from "node:path";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

import { ensureMonitoringSchema } from "@/lib/db/schema";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

const DEFAULT_DATABASE_DIR = path.join(process.cwd(), ".codex-data");
const DEFAULT_DATABASE_PATH = path.join(DEFAULT_DATABASE_DIR, "contentpulse.sqlite");

export function resolveMonitoringDatabasePath(input = DEFAULT_DATABASE_PATH) {
  if (input === ":memory:") {
    return input;
  }

  mkdirSync(path.dirname(input), { recursive: true });
  return input;
}

export function initializeMonitoringDatabase(input?: string) {
  const databasePath = resolveMonitoringDatabasePath(input);
  const database = new DatabaseSync(databasePath);

  ensureMonitoringSchema(database);

  return database;
}

export type MonitoringDatabase = InstanceType<typeof DatabaseSync>;
