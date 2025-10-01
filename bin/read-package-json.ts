import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Read the package.json file of `concurrently`
 */
export function readPackageJson(): Record<string, unknown> {
    const path = require.resolve('concurrently/package.json');
    const content = readFileSync(path, 'utf8');
    return JSON.parse(content);
}
