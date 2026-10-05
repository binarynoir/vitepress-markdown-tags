import { copyFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/vitepress.ts', 'src/theme.ts'],
  format: ['esm', 'cjs'],
  external: ['vue'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node18',
  // tsup can't pass a stylesheet through its dts build, so ship it verbatim.
  onSuccess: async () => {
    await copyFile('src/style.css', 'dist/style.css');
  },
});
