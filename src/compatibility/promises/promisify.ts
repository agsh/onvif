import { Cam } from '../cam';

/** Sync Cam methods that must not be wrapped as callback→Promise. */
const syncMethods = new Set(['updateNC', 'digestAuth']);

const promisifiedMethods: string[] = [];

for (const name of Object.getOwnPropertyNames(Cam.prototype)) {
  if (name !== 'constructor' && !syncMethods.has(name)) {
    promisifiedMethods.push(name);
  }
}

export { promisifiedMethods };

export function promisifyProperty(target: { _cam: Cam }, name: string | symbol): unknown {
  if (typeof name === 'symbol') {
    return undefined;
  }

  const value = (target._cam as unknown as Record<string, unknown>)[name];

  if (typeof value !== 'function') {
    return value;
  }

  if (promisifiedMethods.includes(name)) {
    target._cam.emit('promisify', name);
    return (...args: unknown[]) =>
      new Promise((resolve, reject) => {
        value.apply(target._cam, [
          ...args,
          (error: Error | null, ...data: unknown[]) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(data[0]);
          },
        ]);
      });
  }

  return (...args: unknown[]) => value.apply(target._cam, args);
}
