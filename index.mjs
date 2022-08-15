import fs from 'fs';
import JestHasteMap from 'jest-haste-map';
import { cpus } from 'os';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'jest-worker';
import { join } from 'path';
import chalk from 'chalk';
import { relative } from 'path';

// Get the root path to our project (Like `__dirname`).
const root = dirname(fileURLToPath(import.meta.url));
const hasteMapOptions = {
  extensions: ['js'],
  maxWorkers: cpus().length,
  name: 'best-test-framework',
  platforms: [],
  rootDir: root,
  roots: [root],
};
// Need to use `.default` as of Jest 27.
const hasteMap = new JestHasteMap.default(hasteMapOptions);
// This line is only necessary in `jest-haste-map` version 28 or later.
await hasteMap.setupCachePath(hasteMapOptions);
const { hasteFS } = await hasteMap.build();

const testName = process.argv[2];
const testFiles = hasteFS.matchFilesWithGlob([
  testName ? `**/${testName}*` : '**/*.test.js',
]);

const worker = new Worker(join(root, 'worker.js'), {
  enableWorkerThreads: true,
});

let hasFailed = false;
await Promise.all(
  Array.from(testFiles).map(async (testFile) => {
    const { success, testResults, errorMessage } = await worker.runTest(
      testFile
    );

    const status = success
      ? chalk.green.inverse.bold(' PASS ')
      : chalk.red.inverse.bold(' FAIL ');

    console.log(status + ' ' + chalk.dim(relative(root, testFile)));

    if (!success) {
      hasFailed = true;
      // Make use of the rich `testResults` and error messages.
      if (testResults) {
        testResults
          .filter((result) => result.errors.length)
          .forEach((result) =>
            console.log(
              // Skip the first part of the path which is an internal token.
              result.testPath.slice(1).join(' ') + '\n' + result.errors[0]
            )
          );
        // If the test crashed before `jest-circus` ran, report it here.
      } else if (errorMessage) {
        console.log('  ' + errorMessage);
      }
    }
  })
);

worker.end();
if (hasFailed) {
  console.log(
    '\n' + chalk.red.bold('Test run failed, please fix all the failing tests.')
  );
  // Set an exit code to indicate failure.
  process.exitCode = 1;
}
