import { register } from "node:module";
import { MessageChannel } from "node:worker_threads";

const { port1, port2 } = new MessageChannel();

port1.on("message", (msg) => {
  console.log("Hooks:", msg);
});

register("./hooks.js", {
  parentURL: import.meta.url,
  data: { number: 1, port: port2 },
  transferList: [port2]
});