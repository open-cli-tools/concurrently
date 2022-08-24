import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'bin/concurrently.ts'],
    format: ['cjs', 'esm'],
    bundle: true,
    dts: 'src/index.ts',
    clean: true,
    esbuildOptions(options, context) {
        if (context.format === 'esm') {
            // TODO: See https://github.com/evanw/esbuild/issues/1921
            options.banner = {
                js: 'import { createRequire } from "module";const require = createRequire(import.meta.url);',
            };
        }
    },
});
