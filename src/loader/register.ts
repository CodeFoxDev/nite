import { register } from "node:module";
import { MessageChannel } from "node:worker_threads";

const { port1, port2 } = new MessageChannel();
let resolve: Function = () => null;

port1.on("message", (val) => {
  if (val == "initialized") resolve();
});

register("./index.js", {
  parentURL: import.meta.url,
  data: { number: 1, port: port2 },
  transferList: [port2]
});
// This will halt the execution of the entry file until the command `initialized` is received, which indicates that the server has started
async function waitToRegister() {
  await new Promise((_resolve) => (resolve = _resolve));
  resolve = () => null;
}

await waitToRegister();
