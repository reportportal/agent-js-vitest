import { RPReporter } from '../reporter';
import { config } from './mocks/configMock';
import { RPClientMock } from './mocks/RPClientMock';
import * as vitest from 'vitest';
import { RPTaskMeta } from '../models';
import { STATUSES, TASK_STATUS } from '../constants';

describe('onTaskUpdate', () => {
  let reporter: RPReporter;
  const testTaskId = 'testTaskId';
  const testItemId = 'testId';
  beforeEach(() => {
    reporter = new RPReporter(config);
    reporter.client = new RPClientMock(config);
    reporter.launchId = 'tempLaunchId';
    reporter.testItems.set(testTaskId, {
      id: testItemId,
    });
  });

  describe('finishing test with attributes, testCaseId, description in rpMeta ', () => {
    it('test with attributes, description, testCaseId', () => {
      const attributes = [
        {
          key: 'key1',
          value: 'value1',
        },
      ];
      const description = 'test_description';
      const testCaseId = 'testCaseId';
      const taskMeta: RPTaskMeta = {
        rpMeta: {
          test: {
            logs: [],
            attributes,
            description,
            testCaseId,
          },
        },
      };
      const packs: vitest.TaskResultPack[] = [[testTaskId, { state: TASK_STATUS.pass }, taskMeta]];
      const finishTestItemRQ = {
        status: STATUSES.PASSED,
        attributes,
        description,
        testCaseId,
        endTime: reporter.client.helpers.now(),
      };

      reporter.onTaskUpdate(packs);

      expect(reporter.client.finishTestItem).toBeCalledTimes(1);
      expect(reporter.client.finishTestItem).toBeCalledWith(testItemId, finishTestItemRQ);
    });
  });
});
