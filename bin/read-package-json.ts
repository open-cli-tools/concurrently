import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

/**
 * Read the package.json file of `concurrently`
 */
export function readPackageJson(): Record<string, unknown> {
    let resolver;
    try {
        resolver = require.resolve;
    } catch {
        resolver = createRequire(import.meta.url).resolve;
    }
    const path = resolver('concurrently/package.json');
    const content = readFileSync(path, 'utf8');
    return JSON.parse(content);
}
