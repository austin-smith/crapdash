import path from 'path';

export const DATA_DIR_ENV = 'CRAPDASH_DATA_DIR';

export function getDataDir(): string {
  const configuredDataDir = process.env[DATA_DIR_ENV];

  return configuredDataDir ? path.resolve(configuredDataDir) : path.join(process.cwd(), 'data');
}

export function getConfigPath(): string {
  return path.join(getDataDir(), 'config.json');
}

export function getConfigLockPath(): string {
  return `${getConfigPath()}.lock`;
}

export function getIconsDir(): string {
  return path.join(getDataDir(), 'icons');
}
