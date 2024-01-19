import type { MessagePort } from "node:worker_threads";
import type { ModuleNode } from "modules";
import type { ResolvedConfig, InlineConfig } from "config";
import type * as rollup from "rollup";

export type MessagePortData = {
  "bus:bind": { args: null; res: void };
  "bus:bindSuccess": { args: null; res: void };
  "bus:register": { args: { event: string }; res: void };
  "loader:init": {
    args: null;
    res: number;
  };
  // Plugin container
  "container:config": {
    args: { config: InlineConfig; env: { mode: string; command: string } };
    res: InlineConfig | void;
  };
  "container:configResolved": {
    args: { config: ResolvedConfig };
    res: void;
  };
  "container:resolveId": {
    args: { id: string; importer: string };
    res: rollup.ResolveIdResult;
  };
  "container:load": {
    args: { id: string };
    res: rollup.LoadResult;
  };
  "container:transform": {
    args: { id: string; code: string };
    res: rollup.TransformResult;
  };
  // Module graph
  "graph:getModulesById": {
    args: { id: string };
    res: ModuleNode | undefined;
  };
  "graph:getModulesByFile": {
    args: { file: string };
    res: ModuleNode | undefined;
  };
  "graph:ensureEntryFromFile": {
    args: { file: string };
    res: ModuleNode;
  };
};

export interface MessagePortValue {
  event: keyof MessagePortData;
  data: any;
  time?: number;
}

export class MessageBus {
  bounded: boolean = false;
  port: MessagePort;
  listeners: {
    event: string;
    cb: Function;
  }[];

  functions: string[];
  registered: {
    event: string;
    cb: Function;
  }[];
  waiting: {
    event: string;
    time: number;
    cb: (res: MessagePortValue) => any;
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
        return (this.bounded = true);
      } else if (val.event === "bus:register") {
        this.functions.push(val.data.event);
      } else if (this.functions.includes(val.event)) {
        const wait = this.waiting.find((e) => e.event === val.event && e.time === val.time);
        const i = this.waiting.indexOf(wait);
        if (wait) {
          wait.cb(val);
          this.waiting.splice(i, 1);
        }
      }
      const ls = this.listeners.filter((e) => e.event === val.event);
      for (const l of ls) l.cb(val.data);
    });

    this.port.emit("message", { event: "bus:bind" });
  }

  /**
   * Listens to events received from the bound port
   */
  on<T extends keyof MessagePortData>(event: T, cb: (data: MessagePortData[T]["res"]) => any) {
    this.listeners.push({ event, cb });
  }

  /**
   * Emits an event to the bound port
   */
  emit<T extends keyof MessagePortData>(event: T, data: MessagePortData[T]["args"]) {
    if (!this.port) return;
    this.port.emit("message", { event, data });
  }

  /**
   * Runs a function on the bound port and returns the result
   */
  async run<T extends keyof MessagePortData>(
    event: T,
    data: MessagePortData[T]["args"]
  ): Promise<MessagePortData[T]["res"]> {
    const exists = this.functions.includes(event);
    const time = Date.now();
    if (!exists) return;

    return new Promise((resolve) => {
      const wait = {
        event,
        time,
        cb: (e: MessagePortValue) => {
          resolve(e.data);
        }
      };
      this.waiting.push(wait);
      this.port.emit("message", { event, data, time });
    });
  }

  /**
   * Registers a function to be called from the bound port
   */
  register<T extends keyof MessagePortData>(
    event: T,
    cb: (args: MessagePortData[T]["args"]) => MessagePortData[T]["res"]
  ) {
    this.registered.push({ event, cb });
    this.port.emit("message", {
      event: "bus:register",
      data: { event }
    });
  }
}
