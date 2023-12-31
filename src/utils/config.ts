import { isObject } from "./values";

// Merges the config, the first value has the highest priority
export function mergeConfig(defaults: Record<string, any>, overrides: Record<string, any>): Record<string, any> {
  if (!isObject(defaults) || !isObject(overrides)) {
    throw new Error("Cannot merge config, if parameters aren't of type object");
  }
  return mergeConfigRecursive(defaults, overrides);
}

function mergeConfigRecursive(defaults: Record<string, any>, overrides: Record<string, any>): Record<string, any> {
  const merged: Record<string, any> = { ...defaults };
  for (const key in overrides) {
    const value = overrides[key];
    if (!value) continue;
    const existing = defaults[key];
    if (existing == null) {
      merged[key] = value;
      continue;
    }

    if (Array.isArray(existing) && Array.isArray(value)) {
      merged[key] = [...existing, ...value];
      continue;
    }

    if (isObject(existing) && isObject(value)) {
      merged[key] = mergeConfigRecursive(existing, value);
      continue;
    }

    merged[key] = value;
  }
  return merged;
}

export async function asyncFlatten<T>(arr: T[]): Promise<T[]> {
  // Flattens the array of possible promises until there are no promises left
  do {
    arr = (await Promise.all(arr)).flat(Infinity) as any;
  } while (arr.some((v: any) => v?.then));
  return arr;
}
