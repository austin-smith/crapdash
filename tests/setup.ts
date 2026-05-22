import { afterEach, vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

afterEach(() => {
  delete process.env.CRAPDASH_DATA_DIR;
  vi.restoreAllMocks();
});
