import { ReportingApi } from '../reportingApi';
import type { RunnerTask } from 'vitest';
import { getTask } from './mocks/data';
import { RPTaskMeta } from '../models';

describe('test case id reporting', () => {
  let task: RunnerTask;

  beforeEach(() => {
    task = getTask();
  });

  test('should set test case id to task meta', () => {
    const testCaseId = 'test_case_id';
    ReportingApi.testCaseId(task, testCaseId);

    expect((task.meta as RPTaskMeta).rpMeta.test.testCaseId).toEqual(testCaseId);
  });

  test('should overwrite test case id in task meta', () => {
    const rpMeta: RPTaskMeta = {
      rpMeta: {
        test: {
          logs: [],
          attributes: [],
          testCaseId: 'old_test_case_id',
        },
      },
    };
    task.meta = rpMeta;
    const newTestCaseId = 'new_test_case_id';
    ReportingApi.testCaseId(task, newTestCaseId);

    expect((task.meta as RPTaskMeta).rpMeta.test.testCaseId).toEqual(newTestCaseId);
  });
});
