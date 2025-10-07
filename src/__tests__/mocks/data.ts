import * as vitest from 'vitest';

export function getTask(): vitest.RunnerTask {
  const suite: vitest.RunnerTestSuite = {
    id: 'id',
    name: 'task',
    type: 'suite',
    mode: 'run',
    meta: {},
    tasks: [],
    file: {
      id: 'file-id',
      name: 'test.ts',
      type: 'suite',
      mode: 'run',
      meta: {},
      tasks: [],
      filepath: '/test.ts',
      projectName: 'testProject',
      pool: 'forks',
      collectDuration: 0,
      setupDuration: 0,
      importDurations: {},
      get file(): vitest.RunnerTestFile {
        return this;
      },
    },
  };

  return suite;
}
