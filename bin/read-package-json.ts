import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Reads the package.json file
 */
export function readPackageJson(): Record<string, unknown> {
    const specifier = 'concurrently/package.json';
    let url;
    try {
        url = import.meta.resolve(specifier);
    } catch {
        url = require.resolve(specifier);
    }
    const content = readFileSync(fileURLToPath(url), 'utf-8');
    return JSON.parse(content);
}
