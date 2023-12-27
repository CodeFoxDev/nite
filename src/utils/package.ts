import type { TsconfigRaw } from "esbuild";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

interface packageContents {
  name: string;
  type: string;
}

let foundPackage: packageContents | null = null;

// Add proper default values
export function packageJSON(): null | packageContents {
  if (foundPackage != null) return foundPackage;
  const id = join(cwd(), "package.json");
  if (!id) return null;
  const src = readFileSync(id, { encoding: "utf-8" });
  let obj: packageContents | null;
  try {
    obj = JSON.parse(src);
  } catch {}
  foundPackage = obj;
  return obj;
}

let foundTsconfig: Partial<TsconfigRaw> | null = null;

export function tsconfigJSON(): null | Partial<TsconfigRaw> {
  if (foundTsconfig != null) return foundTsconfig;
  const id = join(cwd(), "tsconfig.json");
  if (!id) return null;
  const src = readFileSync(id, { encoding: "utf-8" });
  let obj: Partial<TsconfigRaw> | null;
  try {
    obj = JSON.parse(src);
  } catch {}
  foundTsconfig = obj;
  return obj;
}
