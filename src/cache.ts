export type ResolvedIconGetResponse = { data: string };
export type IconGetResponse = Promise<{ data: string }>;
// an Error is a failed load, kept until it is retried
export type IconDefOrPromise = string | IconGetResponse | Error;

class Cache {
  private cache: { [key: string]: IconDefOrPromise };

  constructor() {
    this.cache = {};
  }

  check(key: string) {
    const res = this.cache[key];
    return !!res;
  }

  async get(key: string) {
    const res = this.cache[key];
    if (res instanceof Error) throw res;
    if (!res || typeof res === 'string') return res; // undefined & already loaded resource

    return (await res).data;
  }

  set(key: string, value: IconDefOrPromise) {
    this.cache[key] = value;
  }

  /** Removes the entry only while it is still `value`, so that a newer entry stored meanwhile survives */
  deleteIf(key: string, value: IconDefOrPromise) {
    if (this.cache[key] === value) delete this.cache[key];
  }

  clearFailures() {
    for (const prop of Object.getOwnPropertyNames(this.cache)) {
      if (this.cache[prop] instanceof Error) delete this.cache[prop];
    }
  }

  clear() {
    for (const prop of Object.getOwnPropertyNames(this.cache)) {
      delete this.cache[prop];
    }
  }
}

export const globalCache = new Cache();
