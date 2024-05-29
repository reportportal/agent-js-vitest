import * as vitest from 'vitest';

export function getTask(): vitest.Task {
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
