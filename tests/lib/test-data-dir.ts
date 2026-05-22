import { mkdtemp, mkdir, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { DATA_DIR_ENV } from '@/lib/paths';

export async function createTestDataDir(name: string): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), `crapdash-${name}-`));
  const dataDir = path.join(rootDir, 'data');

  await mkdir(path.join(dataDir, 'icons'), { recursive: true });
  process.env[DATA_DIR_ENV] = dataDir;

  return rootDir;
}

export async function removeTestDataDir(rootDir: string): Promise<void> {
  await rm(rootDir, { recursive: true, force: true });
}
