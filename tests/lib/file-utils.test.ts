import { readFile, readdir, writeFile } from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  backupServiceIconFiles,
  copyIconToService,
  isProvisionalIconPath,
  promoteProvisionalIcon,
  restoreServiceIconFiles,
  writeIconBuffer,
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

  it('copies a managed icon to a new service basename', async () => {
    await writeIcon('grafana.png', 'source icon');

    const copiedPath = await copyIconToService('icons/grafana.png', 'grafana-copy');
    const files = await readdir(getIconsDir());

    expect(copiedPath).toBe('icons/grafana-copy.png');
    expect(files).toEqual(expect.arrayContaining(['grafana.png', 'grafana-copy.png']));
    await expect(readFile(path.join(getIconsDir(), 'grafana.png'), 'utf-8')).resolves.toBe('source icon');
    await expect(readFile(path.join(getIconsDir(), 'grafana-copy.png'), 'utf-8')).resolves.toBe('source icon');
  });

  it('chooses a unique target when the default copy basename is reserved', async () => {
    await writeIcon('grafana.png', 'source icon');
    await writeIcon('grafana-copy.svg', 'reserved icon');

    const copiedPath = await copyIconToService('icons/grafana.png', 'grafana-copy', {
      reservedIconBasenames: new Set(['grafana-copy']),
    });
    const copiedFilename = path.basename(copiedPath);

    expect(copiedPath).toMatch(/^icons\/grafana-copy-[a-f0-9-]+\.png$/);
    await expect(readFile(path.join(getIconsDir(), 'grafana-copy.svg'), 'utf-8')).resolves.toBe('reserved icon');
    await expect(readFile(path.join(getIconsDir(), copiedFilename), 'utf-8')).resolves.toBe('source icon');
  });

  it('preserves protected icon paths during same-basename cleanup', async () => {
    await writeIcon('grafana.svg', 'protected icon');
    await writeIcon('grafana.ico', 'stale icon');

    await writeIconBuffer(Buffer.from('new icon'), 'grafana.png', {
      baseNameForCleanup: 'grafana',
      protectedIconPaths: new Set(['icons/grafana.svg']),
    });

    const files = await readdir(getIconsDir());
    expect(files).toEqual(expect.arrayContaining(['grafana.svg', 'grafana.png']));
    expect(files).not.toContain('grafana.ico');
    await expect(readFile(path.join(getIconsDir(), 'grafana.svg'), 'utf-8')).resolves.toBe('protected icon');
    await expect(readFile(path.join(getIconsDir(), 'grafana.png'), 'utf-8')).resolves.toBe('new icon');
  });
});
