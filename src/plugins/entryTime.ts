import type { Plugin } from "modules/plugin";

export default function PluginEntryTime(): Plugin {
  const vmodId = "virtual:nite-entry";
  const vmodIdResolved = "\0" + vmodId;

  let finished = false;
  return {
    name: "nite:entry",

    resolveId(id) {
      if (id == vmodId) return vmodIdResolved;
    },

    load(id) {
      if (id != vmodIdResolved) return;
      return `export function __nite__entry__c(a) {
        console.log('\x1b[90m'+(new Date()).toLocaleTimeString()+'\x1b[0m','\x1b[36m[nite]\x1b[90m[plugins][entry]\x1b[0m',a);
      }; __nite__entry__c("Loaded entry file in "+(Date.now()-${Date.now()})+" miliseconds");`;
    },

    transform(src, id) {
      if (finished) return;
      finished = true;

      return {
        code: `
        // Start of injection by nite:entry
        import { __nite__entry__c } from "${vmodId}";
        __nite__entry__c("Executed entry file in "+(Date.now()-${Date.now()})+" miliseconds");
        // End of injection by nite:entry
        ${src}`
      };
    }
  };
}
