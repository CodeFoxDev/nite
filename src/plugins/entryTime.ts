import type { Plugin } from "modules/plugin";

export default function PluginEntryTime(): Plugin {
  let finished = false;
  return {
    name: "nite:entry",

    transform(src, id) {
      if (finished) return;
      finished = true;

      return {
        code: `
        // Injected by nite:entry to measure entry load times, this can be disabled in the config
        console.log('\x1b[90m'+(new Date()).toLocaleTimeString()+'\x1b[0m','\x1b[36m[nite]\x1b[90m[plugins][entry]\x1b[0m',"Loaded entry file in "+(Date.now()-${Date.now()})+" miliseconds");
        // Original code
        ${src}`
      };
    }
  };
}
