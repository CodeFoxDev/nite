import { register } from "node:module";
import { MessageChannel } from "node:worker_threads";

const { port1, port2 } = new MessageChannel();
let resolve: Function;

port1.on("message", (val) => {
  if (val == "initialized") {
    if (resolve) resolve();
  }
});

register("./index.js", {
  parentURL: import.meta.url,
  data: { number: 1, port: port2 },
  transferList: [port2]
});

async function waitToRegister() {
  await new Promise((_resolve) => {
    resolve = _resolve;
  });
  resolve = () => null;
}

await waitToRegister();
