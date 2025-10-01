import fs from 'node:fs';

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
    const content = fs.readFileSync(url, 'utf-8');
    return JSON.parse(content);
}
