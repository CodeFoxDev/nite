import * as path from "node:path";
import * as fs from "node:fs";
import * as readLine from "node:readline/promises";
import { createServer } from "server";
import { normalizePath, normalizeNodeHook } from "utils/id";
import { c, errorQuit } from "utils/logger";
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
    const s = Date.now();
    const server = await createServer({});

    await bindCliShortcuts();
    console.log(`  ${c.green("NITE v0.1.0")}  ${c.dim("ready in")} ${Date.now() - s} ms`);
    console.log(`  ${c.dim().green("➜")}  ${c.dim("press")} h ${c.dim("to show help")}`);
  });

cli.command("build", "Builds the project").action(async (options) => {
  console.log("build");
});

cli.help();
cli.version(VERSION);
cli.parse();

async function getPackageContent(root: string, specified: string) {
  const resolved = path.resolve(root, "package.json");
  if (!fs.existsSync(resolved)) {
    if (specified == ".") await errorQuit(`${c.red("No package.json found in the project root")}`);
    else await errorQuit(`${c.red("Failed to locate specified entry file")}`);
    // TODO: quit here because the file doesn't exist
    return { main: "index.js" };
  }
  const content = fs.readFileSync(resolved, { encoding: "utf-8" });
  const parsed = JSON.parse(content);
  return parsed;
}

async function bindCliShortcuts() {
  let { stdin } = process;

  stdin
    .setRawMode(true)
    .resume()
    .setEncoding("utf-8")
    .on("data", (i: string) => {
      if (i === "\u0003" || i === "q") process.exit();
      else if (i === "h") {
        console.log(`
  Shortcuts
  ${c.dim("press")} r ${c.dim("to restart server")}
  ${c.dim("press")} c ${c.dim("to clear console")}
  ${c.dim("press")} q ${c.dim("to quit")}`);
      } else if (i === "c") {
        console.clear();
        console.log(`${c.dim("console cleared")}`);
      }
    });
}
