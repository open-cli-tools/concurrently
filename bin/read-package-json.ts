import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Read the package.json file of `concurrently`
 */
export function readPackageJson(): Record<string, unknown> {
    const specifier = 'concurrently/package.json';
    let path;
    try {
        const url = import.meta.resolve(specifier);
        path = fileURLToPath(url);
    } catch {
        path = require.resolve(specifier);
    }
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content);
}
