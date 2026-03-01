import { build } from 'tsdown';
import type { TestProject, TestSpecification } from 'vitest/node';

function buildProject() {
    return build({ clean: false, logLevel: 'silent' });
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
