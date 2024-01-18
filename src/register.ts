import type { MessagePortData, MessagePortValue } from "loader";
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
        const time: MessagePortData["initialized"] = val.data;
        resolve({
          time,
          port
        });
      }
    });
  });
}

export class MessageBus {
  port: MessagePort;
  listeners: {
    event: string;
    cb: Function;
  }[];

  constructor(port?: MessagePort) {
    this.listeners = [];
    if (port) this.setPort(port);
  }

  setPort(port: MessagePort) {
    this.port = port;
    this.port.on("message", (val: MessagePortValue) => {
      if (!val) return;
      const ls = this.listeners.filter((e) => e.event === val.event);
      for (const l of ls) l.cb(val.data);
    });
  }

  on<T extends keyof MessagePortData>(event: T, cb: (data: MessagePortData[T]) => any) {
    this.listeners.push({ event, cb });
  }

  emit<T extends keyof MessagePortData>(event: T, data: MessagePortData[T]) {
    if (!this.port) return;
    this.port.emit("message", { event, data });
  }
}
