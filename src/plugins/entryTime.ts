import type { Plugin } from "modules";

export default function PluginEntryTime(): Plugin {
  const vmodId = "virtual:nite-entry";
  const vmodIdResolved = "\0" + vmodId;

  let entryId: string;
  return {
    name: "nite:entry",

    resolveId(id, importer) {
      if (importer === undefined) entryId = id;
      if (id == vmodId) return vmodIdResolved;
    },

    load(id) {
      if (id != vmodIdResolved) return;
      return `export const start_time = Date.now();
      export function entry_time(a) {
        console.log('\x1b[90m'+(new Date()).toLocaleTimeString()+'\x1b[0m','\x1b[36m[nite]\x1b[90m[plugins][entry]\x1b[0m',a);
      }; /* entry_time("Loaded entry file in "+(Date.now()-start_time)+" miliseconds"); */`;
    },

    transform(src, id) {
      if (id !== entryId) return;

      return {
        code: `
        // Start of injection by nite:entry
        import { entry_time as __nite__entry__plugin, start_time as __nite__entry__time } from "${vmodId}";
        __nite__entry__plugin("Executed entry file in "+(Date.now()-__nite__entry__time)+" miliseconds");
        // End of injection by nite:entry
        ${src}`
      };
    }
  };
}
