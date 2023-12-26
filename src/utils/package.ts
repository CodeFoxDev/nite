import { readFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";

interface packageContents {
  name: string;
  type: string;
}

let found: packageContents | null = null;

// Add proper default values
export function packageJSON(): null | packageContents {
  if (found != null) return found;
  const id = join(cwd(), "package.json");
  if (!id) return null;
  const src = readFileSync(id, { encoding: "utf-8" });
  let obj: packageContents | null;
  try {
    obj = JSON.parse(src);
  } catch {}
  found = obj;
  return obj;
}
