import { readFile, readdir, writeFile } from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  backupServiceIconFiles,
  isProvisionalIconPath,
  promoteProvisionalIcon,
  restoreServiceIconFiles,
} from '@/lib/file-utils';
import { getIconsDir } from '@/lib/paths';
import { createTestDataDir, removeTestDataDir } from './test-data-dir';

let rootDir: string;

async function writeIcon(filename: string, content: string): Promise<void> {
  await writeFile(path.join(getIconsDir(), filename), content);
}

describe('file-utils icon persistence', () => {
  beforeEach(async () => {
    rootDir = await createTestDataDir('file-utils');
  });

  afterEach(async () => {
    await removeTestDataDir(rootDir);
  });

  it('recognizes only provisional icon paths as provisional', () => {
    expect(isProvisionalIconPath('icons/__tmp-favicon-abc.png')).toBe(true);
    expect(isProvisionalIconPath('icons/service.png')).toBe(false);
    expect(isProvisionalIconPath('../icons/__tmp-favicon-abc.png')).toBe(false);
  });

  it('promotes a provisional icon to the service basename', async () => {
    await writeIcon('__tmp-favicon-preview.png', 'new icon');
    await writeIcon('grafana.svg', 'old icon');
    await writeIcon('other.svg', 'other icon');

    const promotedPath = await promoteProvisionalIcon('icons/__tmp-favicon-preview.png', 'grafana');
    const files = await readdir(getIconsDir());

    expect(promotedPath).toBe('icons/grafana.png');
    expect(files).toEqual(expect.arrayContaining(['__tmp-favicon-preview.png', 'grafana.png', 'other.svg']));
    expect(files).not.toContain('grafana.svg');
    await expect(readFile(path.join(getIconsDir(), 'grafana.png'), 'utf-8')).resolves.toBe('new icon');
    await expect(readFile(path.join(getIconsDir(), 'other.svg'), 'utf-8')).resolves.toBe('other icon');
  });

  it('restores service icon files from backup after replacement', async () => {
    await writeIcon('grafana.svg', 'old icon');
    await writeIcon('__tmp-favicon-preview.ico', 'new icon');

    const backup = await backupServiceIconFiles('grafana');
    await promoteProvisionalIcon('icons/__tmp-favicon-preview.ico', 'grafana');
    await restoreServiceIconFiles('grafana', backup);
    const files = await readdir(getIconsDir());

    expect(files).toEqual(expect.arrayContaining(['__tmp-favicon-preview.ico', 'grafana.svg']));
    expect(files).not.toContain('grafana.ico');
    await expect(readFile(path.join(getIconsDir(), 'grafana.svg'), 'utf-8')).resolves.toBe('old icon');
  });
});
