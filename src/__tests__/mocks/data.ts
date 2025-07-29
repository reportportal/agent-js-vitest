import * as vitest from 'vitest';

export function getTask(): vitest.RunnerTask {
  return {
    id: 'id',
    name: 'task',
    type: 'suite',
    mode: 'run',
    tasks: [],
    meta: {},
    projectName: 'testProject',
  };
}
