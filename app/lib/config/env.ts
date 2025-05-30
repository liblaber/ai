/* eslint-disable @blitz/lines-around-comment */
const _envShim = Object.create(null);

export type EnvObject = Record<string, string | undefined>;

const _getEnv = (useShim?: boolean) =>
  globalThis.process?.env ||
  // @ts-ignore No __env__ type
  globalThis.__env__ ||
  (useShim ? _envShim : globalThis);

export const env = new Proxy<EnvObject>(_envShim, {
  get(_, prop) {
    const env = _getEnv();
    return env[prop as any] ?? _envShim[prop];
  },
  has(_, prop) {
    const env = _getEnv();
    return prop in env || prop in _envShim;
  },
  set(_, prop, value) {
    const env = _getEnv(true);
    env[prop as any] = value;

    return true;
  },
  ownKeys() {
    const env = _getEnv(true);
    return Object.keys(env);
  },
});
