import { AsyncLocalStorage } from "node:async_hooks";
import type { AnyD1Database } from "drizzle-orm/d1";

export type RuntimeEnv = { DB?: AnyD1Database };

const storageKey = Symbol.for("kevin-seo-dashboard.runtime-env");
type RuntimeGlobal = typeof globalThis & { [storageKey]?: AsyncLocalStorage<RuntimeEnv> };

export function getRuntimeStorage() {
  const runtimeGlobal = globalThis as RuntimeGlobal;
  runtimeGlobal[storageKey] ??= new AsyncLocalStorage<RuntimeEnv>();
  return runtimeGlobal[storageKey];
}

export function getRuntimeEnv() {
  return getRuntimeStorage().getStore();
}
