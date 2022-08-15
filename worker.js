const fs = require('fs');
const vm = require('vm');
const { basename, dirname, join } = require('path');
const NodeEnvironment = require('jest-environment-node').default;
const expect = require('expect').default;
const mock = require('jest-mock');
const { describe, it, run, resetState } = require('jest-circus');

exports.runTest = async function (testFile) {
  const code = await fs.promises.readFile(testFile, 'utf8');

  const testResult = {
    success: false,
    errorMessage: null,
  };

  try {
    resetState();

    // `eval` within a new vm in each test
    // otherwise the worker will retain state from prevous tests
    const context = { describe, it, expect, mock };

    let environment;

    const customRequire = (fileName) => {
      const code = fs.readFileSync(join(dirname(testFile), fileName), 'utf8');
      const moduleFactory = vm.runInContext(
        // Inject require as a variable here.
        `(function(module, require) {${code}})`,
        environment.getVmContext()
      );
      const module = { exports: {} };
      // And pass customRequire into our moduleFactory.
      moduleFactory(module, customRequire);
      return module.exports;
    };

    environment = new NodeEnvironment({
      projectConfig: {
        testEnvironmentOptions: context,
      },
    });

    // Use `customRequire` to run the test file.
    customRequire(basename(testFile));

    const { testResults } = await run();
    testResult.testResults = testResults;
    testResult.success = testResults.every((result) => !result.errors.length);
  } catch (error) {
    testResult.errorMessage = error.message;
  }
  return testResult;
};
