import { ReportingApi } from '../reportingApi';

describe('test case id reporting', () => {
  let task: any;

  beforeEach(() => {
    task = { meta: {} };
  });

  test('should set test case id to task meta', () => {
    const testCaseId = 'test_case_id';
    ReportingApi.testCaseId(task, testCaseId);

    expect(task.meta.rpMeta.test.testCaseId).toEqual(testCaseId);
  });

  test('should overwrite test case id in task meta', () => {
    task.meta = {
      rpMeta: {
        test: {
          logs: [],
          attributes: [],
          testCaseId: 'old_test_case_id',
        },
      },
    };
    const newTestCaseId = 'new_test_case_id';
    ReportingApi.testCaseId(task, newTestCaseId);

    expect(task.meta.rpMeta.test.testCaseId).toEqual(newTestCaseId);
  });
});
