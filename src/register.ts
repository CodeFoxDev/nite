import type { MessagePortData, MessagePortValue } from "bus";
import type { ResolvedConfig } from "config";
import { register as n_register } from "node:module";
import { MessageChannel, MessagePort } from "node:worker_threads";

interface RegisterResult {
  time: number;
  port: MessagePort;
}

export async function register(config: ResolvedConfig, importer: string): Promise<RegisterResult> {
  const { port1: port, port2 } = new MessageChannel();

  n_register("./loader.js", {
    parentURL: import.meta.url,
    data: { number: 1, port: port2, config, importer },
    transferList: [port2]
  });

  return new Promise((resolve: (data: RegisterResult) => any) => {
    port.on("message", (val: MessagePortValue) => {
      if (val.event === "initialized") {
        const time: MessagePortData["initialized"]["res"] = val.data;
        resolve({
          time,
          port
        });
      }
    });
  });
}