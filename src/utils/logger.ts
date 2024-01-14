import { stdout } from "node:process";

const showTimestamps = true;
const showColors = true;
const modifyConsoleLog = false;

const _consoleLog = console.log.bind(console);

enum logTypes {
  INFO,
  WARN,
  ERROR
}

class _Logger {
  service: string;
  identifier: string[] | null;
  #conditionFn: Function;

  constructor(service: string, identifier?: string[]) {
    this.service = service;
    this.identifier = identifier;
  }
  #write(data: any[], type: logTypes) {
    if (!this.#shouldLog()) return;
    if (showTimestamps) stdout.write(this.#formatTimeStamp());
    stdout.write(this.#formatPrefix());
    if (showColors) {
      if (type == logTypes.WARN) stdout.write("\x1b[33m");
      else if (type == logTypes.ERROR) stdout.write("\x1b[31m");
    }
    stdout.write(" ");
    _consoleLog(...data);
    stdout.write("\x1b[0m");
  }
  #formatTimeStamp() {
    const t = new Date();
    const sec = t.getSeconds() < 10 ? `0${t.getSeconds()}` : `${t.getSeconds()}`;
    const min = t.getMinutes() < 10 ? `0${t.getMinutes()}` : `${t.getMinutes()}`;
    const hour = t.getHours() < 10 ? `0${t.getHours()}` : `${t.getHours()}`;
    if (!showColors) return `${hour}:${min}:${sec}`;
    return `\x1b[90m${hour}:${min}:${sec}\x1b[0m `;
  }
  #formatPrefix() {
    const subs = this.identifier ? `[${this.identifier.join("][")}]` : "";
    if (!showColors) return `[${this.service}]${subs}`; // ${this.identifier ? `[${this.identifier}]` : ""}
    return `\x1b[36m[${this.service}]\x1b[90m${subs}\x1b[0m`; // ${this.identifier ? `\x1b[90m[${this.identifier}]` : ""}
  }
  #shouldLog() {
    if (!this.#conditionFn) return true;
    return this.#conditionFn();
  }
  info(...data: any[]) {
    this.#write(data, logTypes.INFO);
  }
  warn(...data: any[]) {
    this.#write(data, logTypes.WARN);
  }
  error(...data: any[]): false {
    // TODO: add stacktrace?
    this.#write(data, logTypes.ERROR);
    return false; // To be able to do: return logger.error(...);
  }
  condition(cb: Function) {
    if (typeof cb != "function") return;
    this.#conditionFn = cb;
  }
}

export class Logger extends _Logger {
  constructor(identifier: string[]) {
    super("nite", identifier);
  }
}

export class PartialLogger extends Logger {
  base: string[];
  constructor(baseIdentifier: string[]) {
    super(baseIdentifier);
    this.base = baseIdentifier;
  }
  infoName(name: string[] | string, ...data: any[]) {
    this.identifier = [...this.base, ...(Array.isArray(name) ? name : [name])];
    this.info(...data);
  }
  warnName(name: string[] | string, ...data: any[]) {
    this.identifier = [...this.base, ...(Array.isArray(name) ? name : [name])];
    this.warn(...data);
  }
  errorName(name: string[] | string, ...data: any[]): false {
    this.identifier = [...this.base, ...(Array.isArray(name) ? name : [name])];
    this.error(...data);
    return false;
  }
}

export function warn(msg: string) {
  console.log(c.yellow(msg));
}

const R = "\x1b[0m";

let stack = "";

function f(code: string, str: string): any {
  stack += `${code}`;
  if (typeof str == "string") {
    const res = `${stack}${str}${R}` as string;
    stack = "";
    return res;
  }
  return c;
}

interface C {
  dim(str?: string): C;
  green(str?: string): C;
  yellow(str?: string): C;
  cyan(str?: string): C;
}

export const c: C = {
  dim: (str) => f("\x1b[2m", str),

  green: (str) => f("\x1b[32m", str),
  yellow: (str) => f("\x1b[33m", str),
  cyan: (str) => f("\x1b[36m", str)
};
