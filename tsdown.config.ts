import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    outDir: 'dist',
    sourcemap: true,
    dts: true,
    minify: true,
    target: 'node18',
    external: ['bun', 'bun:*'],
    treeshake: true,
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
});
