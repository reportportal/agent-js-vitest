import { ReportingApi } from '../reportingApi';
import type { RunnerTask } from 'vitest';
import { getTask } from './mocks/data';
import { RPTaskMeta } from '../models';

describe('test description reporting', () => {
  let task: RunnerTask;

  beforeEach(() => {
    task = getTask();
  });

  test('should add description to task meta', () => {
    const description = 'test description';
    ReportingApi.description(task, description);

    expect((task.meta as RPTaskMeta).rpMeta.test.description).toEqual(description);
  });

  test('should append data to existing description in task meta', () => {
    const existingDescription = 'test description';
    const rpMeta: RPTaskMeta = {
      rpMeta: {
        test: {
          logs: [],
          attributes: [],
          description: existingDescription,
        },
      },
    };
    task.meta = rpMeta;
    const newDescription = 'new test description';
    ReportingApi.description(task, newDescription);

    expect((task.meta as RPTaskMeta).rpMeta.test.description).toEqual(
      existingDescription + '\n' + newDescription,
    );
  });
});
