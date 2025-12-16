import clientHelpers from '@reportportal/client-javascript/lib/helpers';
import { RPReporter } from '../reporter';
import { config } from './mocks/configMock';
import { RPClientMock, mockedDate } from './mocks/RPClientMock';
import { RPTaskMeta } from '../models';
import { STATUSES } from '../constants';

type ReporterTestCase = Parameters<RPReporter['onTestCaseResult']>[0];

const createTestCase = ({
  id,
  state = 'passed',
  errors,
  meta,
  diagnosticStart = 1000,
  diagnosticDuration = 25,
}: {
  id: string;
  state?: string;
  errors?: unknown[];
  meta?: RPTaskMeta;
  diagnosticStart?: number;
  diagnosticDuration?: number;
}): ReporterTestCase =>
  ({
    id,
    type: 'test',
    name: 'test',
    module: undefined,
    options: {
      each: false,
      fails: false,
      concurrent: false,
      shuffle: false,
      retry: 0,
      repeats: 0,
      mode: 'run',
    },
    parent: undefined,
    result: () => ({
      state,
      errors,
    }),
    diagnostic: () => ({
      startTime: diagnosticStart,
      duration: diagnosticDuration,
      slow: false,
      heap: 0,
      retryCount: 0,
      repeatCount: 0,
      flaky: false,
    }),
    meta: () => meta || ({} as RPTaskMeta),
  }) as unknown as ReporterTestCase;

describe('onTestCaseResult', () => {
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
      const testCase = createTestCase({ id: testTaskId, meta: taskMeta });
      const finishTestItemRQ = {
        status: STATUSES.PASSED,
        attributes,
        description,
        testCaseId,
        endTime: testCase.diagnostic().startTime + Math.round(testCase.diagnostic().duration),
      };

      reporter.onTestCaseResult(testCase);

      expect(reporter.client.finishTestItem).toBeCalledTimes(1);
      expect(reporter.client.finishTestItem).toBeCalledWith(testItemId, finishTestItemRQ);
    });
  });
});
