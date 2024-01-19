import type { MessagePort } from "node:worker_threads"
import type * as rollup from "rollup";

export type MessagePortData = {
  "bus:bind": { args: null; res: null }
  "bus:bindSuccess": { args: null; res: null }
  initialized: {
    args: null;
    res: number;
  }
  "container:resolveId": {
    args: { id: string; importer: string; }
    res: rollup.ResolveIdResult
  };
  "container:load": {
    args: { id: string; }
    res: rollup.LoadResult
  };
  "container:transform": {
    args: { id: string; code: string; };
    res: rollup.TransformResult
  }
}

export interface MessagePortValue {
  event: keyof MessagePortData;
  data: any;
}

export class MessageBus {
  bounded: boolean = false;
  port: MessagePort;
  listeners: {
    event: string;
    cb: Function;
  }[];

  constructor(port?: MessagePort) {
    this.listeners = [];
    if (port) this.bind(port);
  }

  // TODO: Make this async to wait for bind confirmation
  bind(port: MessagePort) {
    this.port = port;
    this.port.on("message", (val: MessagePortValue) => {
      if (!val) return;
      if (val.event === "bus:bind" || val.event === "bus:bindSuccess") {
        if (val.event === "bus:bind") this.port.emit("message", { event: "bus:bindSuccess" });
        else if (val.event === "bus:bindSuccess") console.log("Succesfully bound the messageBus");
        return this.bounded = true;
      }
      const ls = this.listeners.filter((e) => e.event === val.event);
      for (const l of ls) l.cb(val.data);
    });

    this.port.emit("message", { event: "bus:bind" });
  }

  on<T extends keyof MessagePortData>(event: T, cb: (data: MessagePortData[T]["res"]) => any) {
    this.listeners.push({ event, cb });
  }

  emit<T extends keyof MessagePortData>(event: T, data: MessagePortData[T]["args"]) {
    if (!this.port) return;
    this.port.emit("message", { event, data });
  }
}
