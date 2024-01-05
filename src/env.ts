import * as fs from "node:fs";
import * as path from "node:path";
import * as _dotenv from "dotenv";
import { PartialLogger } from "utils/logger";
const { parse } = _dotenv;

const logger = new PartialLogger(["env"]);

export function loadEnv(mode: string, envDir: string): Record<string, string> {
  const env: Record<string, string> = {};
  const envFiles = getEnvFilesForMode(mode, envDir);

  for (const f of envFiles) {
    if (!fs.existsSync(f)) continue;
    try {
      const s = fs.readFileSync(f);
      const parsed = parse(s);
      for (const i in parsed) if (!env[i]) env[i] = parsed[i];
    } catch (e) {
      logger.error("Error while parsing env file, ", e);
    }
  }
  return env;
}

export function getEnvFilesForMode(mode: string, envDir?: string) {
  function b(s: string) {
    if (!envDir) return s;
    return path.resolve(envDir, s);
  }
  return [b(".env"), b(".env.local"), b(`.env.${mode}`), b(`.env.${mode}.local`)];
}
