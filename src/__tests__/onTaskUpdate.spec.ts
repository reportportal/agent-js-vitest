import clientHelpers from '@reportportal/client-javascript/lib/helpers';
import { RPReporter } from '../reporter';
import { config } from './mocks/configMock';
import { RPClientMock, mockedDate } from './mocks/RPClientMock';
import { RPTaskMeta } from '../models';
import { STATUSES, TASK_STATUS } from '../constants';
import * as vitest from 'vitest';

describe('onTaskUpdate', () => {
  jest.spyOn(clientHelpers, 'now').mockReturnValue(mockedDate);

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
      const packs: vitest.RunnerTaskResultPack[] = [
        [testTaskId, { state: TASK_STATUS.pass }, taskMeta],
      ];
      const finishTestItemRQ = {
        status: STATUSES.PASSED,
        attributes,
        description,
        testCaseId,
        endTime: '2024-09-23T12:20:59.392987Z',
      };

      reporter.onTaskUpdate(packs);

      expect(reporter.client.finishTestItem).toBeCalledTimes(1);
      expect(reporter.client.finishTestItem).toBeCalledWith(testItemId, finishTestItemRQ);
    });
  });
});
