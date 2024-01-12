import { register as n_register } from "node:module";
import { MessageChannel } from "node:worker_threads";

const { port1, port2 } = new MessageChannel();

export async function register(importer: string) {
  return new Promise((resolve) => {
    n_register("./index.js", {
      parentURL: import.meta.url,
      data: { number: 1, port: port2, importer },
      transferList: [port2]
    });

    port1.on("message", (val) => {
      if (val == "initialized") resolve(null);
    });
  });
}
