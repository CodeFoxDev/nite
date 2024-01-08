import * as path from "node:path";
import * as fs from "node:fs";
import { normalizePath, normalizeNodeHook } from "utils/id";
import { VERSION } from "./constants";
import { cac } from "cac";

// Commands
// - `nite ...`
// - `nite dev ...`
// - `nite build ...`

const cli = cac("nite");

cli
  .option("-c, --config <file>", "[string] Use specified config file")
  .option("-d, --debug", "[boolean] Shows debug logs")
  .option("-m, --mode", "[string] Set env mode");

cli
  .command("[root]", "Starts the nite dev server")
  .alias("dev")
  .option("-f, --force", "[boolean] Force the dependeny optimizer to rerun")
  .action(async (root: string, options) => {
    if (root === undefined) root = ".";
    const resolvedRoot = path.resolve(process.cwd(), root);
    const resolvePackage = getPackageContent(resolvedRoot);
    const resolvedEntry = normalizePath(path.resolve(resolvedRoot, resolvePackage.main));

    // Pass cli options to the loader
    await import("./loader/register");
    await import(normalizeNodeHook(resolvedEntry));
  });

cli.command("build", "Builds the project").action(async (options) => {
  console.log("build");
});

cli.help();
cli.version(VERSION);
cli.parse();

function getPackageContent(root: string) {
  const resolved = path.resolve(root, "package.json");
  if (!fs.existsSync(resolved)) {
    console.error("ERROR: No package.json found in the project root");
    return { main: "index.js" };
  }
  const content = fs.readFileSync(resolved, { encoding: "utf-8" });
  const parsed = JSON.parse(content);
  return parsed;
}
