import type { MessagePort } from "node:worker_threads";
import type { ModuleNode } from "modules";
import type { ResolvedConfig, InlineConfig } from "config";
import type * as rollup from "rollup";

export type MessagePortData = {
  "bus:bind": { args: null; res: void }
  "bus:bindSuccess": { args: null; res: void }
  "loader:init": {
    args: null;
    res: number;
  }
  // Plugin container
  "container:config": {
    args: { config: InlineConfig; env: { mode: string; command: string }}
    res: InlineConfig | void
  }
  "container:configResolved": {
    args: { config: ResolvedConfig }
    res: void;
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
  // Module graph
  "graph:getModulesById": {
    args: { id: string }
    res: ModuleNode | undefined
  }
  "graph:getModulesByFile": {
    args: { file: string }
    res: ModuleNode | undefined
  }
  "graph:ensureEntryFromFile": {
    args: { file: string }
    res: ModuleNode
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
  async bind(port: MessagePort) {
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
