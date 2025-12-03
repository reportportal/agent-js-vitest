import type { RunnerTestFile, RunnerTestSuite } from 'vitest';

export function getTask(): RunnerTestSuite {
  const file: RunnerTestFile = {
    id: 'file-id',
    name: 'test.ts',
    fullName: '/test.ts',
    type: 'suite',
    mode: 'run',
    meta: {},
    filepath: '/test.ts',
    projectName: 'testProject',
    pool: 'forks',
    collectDuration: 0,
    setupDuration: 0,
    importDurations: {},
    tasks: [],
    get file(): RunnerTestFile {
      return file;
    },
  };

  const suite: RunnerTestSuite = {
    id: 'id',
    name: 'task',
    fullName: '/test.ts > task',
    type: 'suite',
    mode: 'run',
    meta: {},
    tasks: [],
    file,
  };

  return suite;
}
