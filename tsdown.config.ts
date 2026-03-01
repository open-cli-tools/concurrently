import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: {
        bin: 'bin/index.ts',
        lib: 'lib/index.ts',
    },
});
