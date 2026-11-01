/** Private file storage (local disk). Keys are random; files are never served publicly. */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { newToken } from './crypto.ts';

export interface Storage {
  put(data: Buffer): Promise<string>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

export function createDiskStorage(dir: string): Storage {
  const root = resolve(dir);
  const pathFor = (key: string) => {
    if (!/^[A-Za-z0-9_-]{20,64}$/.test(key)) throw new Error('invalid storage key');
    return join(root, key);
  };
  return {
    async put(data) {
      await mkdir(root, { recursive: true });
      const key = newToken(24);
      await writeFile(pathFor(key), data, { mode: 0o600 });
      return key;
    },
    get: (key) => readFile(pathFor(key)),
    remove: (key) => rm(pathFor(key), { force: true }),
  };
}

export function createMemoryStorage(): Storage {
  const m = new Map<string, Buffer>();
  return {
    async put(data) {
      const key = newToken(24);
      m.set(key, data);
      return key;
    },
    async get(key) {
      const v = m.get(key);
      if (!v) throw new Error('not found');
      return v;
    },
    async remove(key) {
      m.delete(key);
    },
  };
}
