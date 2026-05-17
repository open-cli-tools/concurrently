import { exec as originalExec } from 'node:child_process';
import util from 'node:util';

import type { TestProject, TestSpecification } from 'vitest/node';

const exec = util.promisify(originalExec);

function buildProject() {
    return exec('pnpm run build');
}

function isBuildRequired(testFiles: TestSpecification[]) {
    for (const file of testFiles) {
        if (file.project.name === 'e2e' || file.project.name === 'smoke') {
            return true;
        }
    }
    return false;
}

export default async function setup(project: TestProject) {
    // @ts-expect-error not typed
    const pattern: string[] | undefined = project.vitest.filenamePattern;

    const testFiles = await project.vitest.getRelevantTestSpecifications(pattern);

    if (isBuildRequired(testFiles)) {
        await buildProject();
    }

    project.onTestsRerun(async (testFiles) => {
        if (isBuildRequired(testFiles)) {
            await buildProject();
        }
    });
}
