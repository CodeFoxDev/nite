import { readFileSync } from "node:fs";

const PACKAGE = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), { encoding: "utf-8" }));

export const VERSION = PACKAGE.version;
