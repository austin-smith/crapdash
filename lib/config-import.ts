import { promises as fs } from 'fs';
import path from 'path';
import { getIconFilePath, isValidImageExtension } from './file-utils';
import { ICON_TYPES, type DashboardConfig, type ImportWarning } from './types';

function collectImageReferences(config: DashboardConfig): Array<{ field: string; iconPath: string }> {
  const refs: Array<{ field: string; iconPath: string }> = [];

  if (config.appLogo?.type === ICON_TYPES.IMAGE) {
    refs.push({ field: 'appLogo.value', iconPath: config.appLogo.value });
  }

  for (const [index, service] of config.services.entries()) {
    if (service.icon?.type === ICON_TYPES.IMAGE) {
      refs.push({ field: `services.${index}.icon.value`, iconPath: service.icon.value });
    }
  }

  return refs;
}

export async function collectConfigImportWarnings(config: DashboardConfig): Promise<ImportWarning[]> {
  const imageRefs = collectImageReferences(config);

  const warningGroups = await Promise.all(
    imageRefs.map(async ({ field, iconPath }) => {
      const warnings: ImportWarning[] = [];
      const iconFilename = path.basename(iconPath);

      if (!isValidImageExtension(iconFilename)) {
        warnings.push({
          field,
          message: `Icon "${iconPath}" uses an unsupported extension and may not be served correctly.`,
        });
      }

      try {
        await fs.access(getIconFilePath(iconFilename));
      } catch {
        warnings.push({
          field,
          message: `Icon file "${iconPath}" was not found under data/icons.`,
        });
      }

      return warnings;
    })
  );

  return warningGroups.flat();
}
