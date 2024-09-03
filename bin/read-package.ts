import * as fs from 'fs';
import * as path from 'path';

/**
 * Traverses the directory tree until a package.json file is found.
 *
 * @throws if the root directory is reached, and no package.json is found.
 */
export function readPackage(): Record<string, unknown> {
    let dir = require.main?.path ?? process.cwd();
    let oldDir = dir;
    do {
        const pkgPath = path.join(dir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        }

        oldDir = dir;
        dir = path.dirname(dir);
    } while (oldDir !== dir);

    throw new Error('package.json not found');
}
