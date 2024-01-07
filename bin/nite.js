#! /usr/bin/env node

//console.log(process.argv);

async function start() {
  await import("../dist/cli.js");
}

start();
