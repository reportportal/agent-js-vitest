import type { UserConsoleLog } from 'vitest';
import clientHelpers from '@reportportal/client-javascript/lib/helpers';
import { RPReporter } from '../reporter';
import { config } from './mocks/configMock';
import { RPClientMock, mockedDate } from './mocks/RPClientMock';
import {
  getVitestInstance,
  createMockTestCase,
  createMockTestSuite,
  createMockTestModule,
} from './mocks/data';
import { ReportPortalConfig } from '../models';
import { STATUSES, TASK_STATUS, TASK_MODE, PREDEFINED_LOG_LEVELS } from '../constants';

describe('RPReporter', () => {
  jest.spyOn(clientHelpers, 'now').mockReturnValue(mockedDate);

  let reporter: RPReporter;

  beforeEach(() => {
    reporter = new RPReporter(config);
    reporter.client = new RPClientMock(config);
    reporter.launchId = 'tempLaunchId';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const testReporter = new RPReporter(config);

      expect(testReporter.config.extendTestDescriptionWithLastError).toBe(true);
      expect(testReporter.promises).toEqual([]);
      expect(testReporter.testItems).toBeInstanceOf(Map);
    });

    it('should use RP_LAUNCH_ID from environment variable', () => {
      const originalEnv = process.env.RP_LAUNCH_ID;
      process.env.RP_LAUNCH_ID = 'envLaunchId';

      const testReporter = new RPReporter(config);

      expect(testReporter.config.launchId).toBe('envLaunchId');

      process.env.RP_LAUNCH_ID = originalEnv;
    });

    it('should use launchId from config if env variable not set', () => {
      const originalEnv = process.env.RP_LAUNCH_ID;
      delete process.env.RP_LAUNCH_ID;

      const configWithLaunchId: ReportPortalConfig = {
        ...config,
        launchId: 'configLaunchId',
      };

      const testReporter = new RPReporter(configWithLaunchId);

      expect(testReporter.config.launchId).toBe('configLaunchId');

      process.env.RP_LAUNCH_ID = originalEnv;
    });

    it('should override extendTestDescriptionWithLastError from config', () => {
      const configWithOverride: ReportPortalConfig = {
        ...config,
        extendTestDescriptionWithLastError: false,
      };

      const testReporter = new RPReporter(configWithOverride);

      expect(testReporter.config.extendTestDescriptionWithLastError).toBe(false);
    });
  });

  describe('addRequestToPromisesQueue', () => {
    it('should add promise to the queue', () => {
      const promise = Promise.resolve();

      reporter.addRequestToPromisesQueue(promise, 'Test message');

      expect(reporter.promises.length).toBe(1);
    });
  });

  describe('onInit', () => {
    it('should start launch with correct parameters', () => {
      const vitestInstance = getVitestInstance();

      reporter.onInit(vitestInstance);

      expect(reporter.rootDir).toBe('/test/root');
      expect(reporter.client.startLaunch).toHaveBeenCalledTimes(1);
      expect(reporter.client.startLaunch).toHaveBeenCalledWith(
        expect.objectContaining({
          name: config.launch,
          description: config.description,
          startTime: mockedDate,
        }),
      );
    });

    it('should include system attribute in launch attributes', () => {
      const vitestInstance = getVitestInstance();

      reporter.onInit(vitestInstance);

      expect(reporter.client.startLaunch).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: expect.arrayContaining([
            expect.objectContaining({
              key: 'agent',
              system: true,
            }),
          ]),
        }),
      );
    });
  });

  describe('onTestModuleCollected', () => {
    beforeEach(() => {
      reporter.rootDir = '/test/root';
    });

    it('should start test item for collected module', () => {
      const testModule = createMockTestModule({
        id: 'file1',
        moduleId: '/test/root/src/test.spec.ts',
        relativeModuleId: 'src/test.spec.ts',
      });

      reporter.onTestModuleCollected(testModule);

      expect(reporter.client.startTestItem).toHaveBeenCalled();
    });

    it('should not call startTestItem when module is already tracked', () => {
      const testModule = createMockTestModule({ id: 'file1' });
      reporter.testItems.set('file1', { id: 'existingId' });

      reporter.onTestModuleCollected(testModule);

      expect(reporter.client.startTestItem).not.toHaveBeenCalled();
    });

    it('should recursively start children for module with children', () => {
      const testCase = createMockTestCase({ id: 'test1' });
      const testModule = createMockTestModule({ id: 'module1', children: [testCase] });

      reporter.onTestModuleCollected(testModule);

      expect(reporter.client.startTestItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('startReportedEntity', () => {
    beforeEach(() => {
      reporter.rootDir = '/test/root';
    });

    it('should finish skipped tests immediately', () => {
      const skippedTask = createMockTestCase({
        id: 'skippedTest',
        name: 'skipped test',
        mode: 'skip',
      });

      reporter.startReportedEntity(skippedTask, '/src/test.ts');

      expect(reporter.client.finishTestItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: STATUSES.SKIPPED,
        }),
      );
    });

    it('should finish todo tests with todo attribute', () => {
      const todoTask = createMockTestCase({
        id: 'todoTest',
        name: 'todo test',
        mode: 'todo',
      });

      reporter.startReportedEntity(todoTask, '/src/test.ts');

      expect(reporter.client.finishTestItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: STATUSES.SKIPPED,
          attributes: [{ value: TASK_MODE.todo }],
        }),
      );
    });

    it('should add test item to testItems map for run mode', () => {
      const runTask = createMockTestCase({
        id: 'runTest',
        name: 'running test',
        mode: 'run',
      });

      reporter.startReportedEntity(runTask, '/src/test.ts');

      expect(reporter.testItems.has('runTest')).toBe(true);
    });

    it('should recursively start descendants for suite', () => {
      const innerTask = createMockTestCase({
        id: 'test1',
        name: 'test 1',
        mode: 'run',
      });
      const suiteTask = createMockTestSuite({
        id: 'suite1',
        name: 'test suite',
        mode: 'run',
        children: [innerTask],
      });

      reporter.startReportedEntity(suiteTask, '/src/test.ts');

      expect(reporter.client.startTestItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFinishTestItemObj', () => {
    it('should return failed status when TestCase result state is unknown', () => {
      const testCase = createMockTestCase({ id: 'testId', state: 'unrecognized' });

      const result = reporter.getFinishTestItemObj(testCase);

      expect(result.status).toBe(STATUSES.FAILED);
      expect(result.endTime).toBe(mockedDate);
    });

    it('should return passed status for passed TestCase', () => {
      const testCase = createMockTestCase({
        id: 'testId',
        state: TASK_STATUS.passed,
        startTime: 1000,
        duration: 500,
      });

      const result = reporter.getFinishTestItemObj(testCase);

      expect(result.status).toBe(STATUSES.PASSED);
      expect(result.endTime).toBe(1500);
    });

    it('should return failed status for failed TestCase', () => {
      const testCase = createMockTestCase({
        id: 'testId',
        state: TASK_STATUS.failed,
        startTime: 1000,
        duration: 500,
      });

      const result = reporter.getFinishTestItemObj(testCase);

      expect(result.status).toBe(STATUSES.FAILED);
      expect(result.endTime).toBe(1500);
    });

    it('should return skipped status for skipped TestCase', () => {
      const testCase = createMockTestCase({
        id: 'testId',
        state: TASK_STATUS.skipped,
      });

      const result = reporter.getFinishTestItemObj(testCase);

      expect(result.status).toBe(STATUSES.SKIPPED);
    });

    it('should use clientHelpers.now() when startTime or duration is not finite', () => {
      const testCase = createMockTestCase({
        id: 'testId',
        state: TASK_STATUS.passed,
        startTime: NaN,
        duration: NaN,
      });

      const result = reporter.getFinishTestItemObj(testCase);

      expect(result.status).toBe(STATUSES.PASSED);
      expect(result.endTime).toBe(mockedDate);
    });
  });

  describe('sendLog', () => {
    it('should send log with correct parameters', () => {
      const testItemId = 'testItemId';
      const logRq = {
        time: mockedDate,
        level: PREDEFINED_LOG_LEVELS.INFO,
        message: 'Test log message',
      };

      reporter.sendLog(testItemId, logRq);

      expect(reporter.client.sendLog).toHaveBeenCalledWith(
        testItemId,
        expect.objectContaining({
          level: PREDEFINED_LOG_LEVELS.INFO,
          message: 'Test log message',
        }),
        undefined,
      );
    });

    it('should send log with file attachment', () => {
      const testItemId = 'testItemId';
      const logRq = {
        time: mockedDate,
        level: PREDEFINED_LOG_LEVELS.INFO,
        message: 'Test log with attachment',
        file: {
          name: 'screenshot.png',
          type: 'image/png',
          content: 'base64content',
        },
      };

      reporter.sendLog(testItemId, logRq);

      expect(reporter.client.sendLog).toHaveBeenCalledWith(
        testItemId,
        expect.objectContaining({
          message: 'Test log with attachment',
        }),
        logRq.file,
      );
    });
  });

  describe('onUserConsoleLog', () => {
    const testTaskId = 'testTaskId';
    const testItemId = 'testItemId';

    beforeEach(() => {
      reporter.testItems.set(testTaskId, { id: testItemId });
    });

    it('should send log for stdout content', () => {
      const consoleLog: UserConsoleLog = {
        content: 'Console output',
        taskId: testTaskId,
        time: Date.now(),
        type: 'stdout',
        size: 14,
      };

      reporter.onUserConsoleLog(consoleLog);

      expect(reporter.client.sendLog).toHaveBeenCalledWith(
        testItemId,
        expect.objectContaining({
          level: PREDEFINED_LOG_LEVELS.INFO,
          message: 'Console output',
        }),
        undefined,
      );
    });

    it('should send log with WARN level for stderr without error', () => {
      const consoleLog: UserConsoleLog = {
        content: 'Warning message',
        taskId: testTaskId,
        time: Date.now(),
        type: 'stderr',
        size: 15,
      };

      reporter.onUserConsoleLog(consoleLog);

      expect(reporter.client.sendLog).toHaveBeenCalledWith(
        testItemId,
        expect.objectContaining({
          level: PREDEFINED_LOG_LEVELS.WARN,
        }),
        undefined,
      );
    });

    it('should send log with ERROR level for stderr with error content', () => {
      const consoleLog: UserConsoleLog = {
        content: 'Error: Something went wrong',
        taskId: testTaskId,
        time: Date.now(),
        type: 'stderr',
        size: 27,
      };

      reporter.onUserConsoleLog(consoleLog);

      expect(reporter.client.sendLog).toHaveBeenCalledWith(
        testItemId,
        expect.objectContaining({
          level: PREDEFINED_LOG_LEVELS.ERROR,
        }),
        undefined,
      );
    });

    it('should not send log for empty content', () => {
      const consoleLog: UserConsoleLog = {
        content: '',
        taskId: testTaskId,
        time: Date.now(),
        type: 'stdout',
        size: 0,
      };

      reporter.onUserConsoleLog(consoleLog);

      expect(reporter.client.sendLog).not.toHaveBeenCalled();
    });

    it('should send log to launch if test item not found', () => {
      const consoleLog: UserConsoleLog = {
        content: 'Log message',
        taskId: 'unknownTaskId',
        time: Date.now(),
        type: 'stdout',
        size: 11,
      };

      reporter.onUserConsoleLog(consoleLog);

      expect(reporter.client.sendLog).toHaveBeenCalledWith(
        reporter.launchId,
        expect.any(Object),
        undefined,
      );
    });
  });

  describe('onTestCaseResult', () => {
    const testTaskId = 'testTaskId';
    const testItemId = 'testId';

    beforeEach(() => {
      reporter.testItems.set(testTaskId, { id: testItemId });
    });

    it('should not finish test if already finished', () => {
      reporter.testItems.set(testTaskId, { id: testItemId, finishSend: true });
      const testCase = createMockTestCase({ id: testTaskId, state: TASK_STATUS.passed });

      reporter.onTestCaseResult(testCase);

      expect(reporter.client.finishTestItem).not.toHaveBeenCalled();
    });

    it('should finish test case and call finishTestItem', () => {
      const testCase = createMockTestCase({ id: testTaskId, state: TASK_STATUS.passed });

      reporter.onTestCaseResult(testCase);

      expect(reporter.client.finishTestItem).toHaveBeenCalledWith(
        testItemId,
        expect.objectContaining({ status: STATUSES.PASSED }),
      );
    });

    it('should handle task with errors', () => {
      const testCase = createMockTestCase({
        id: testTaskId,
        state: TASK_STATUS.failed,
        errors: [{ message: 'Test failed', stack: 'Error: Test failed\n    at test.ts:10' }],
      });

      reporter.onTestCaseResult(testCase);

      expect(reporter.client.sendLog).toHaveBeenCalled();
      expect(reporter.client.finishTestItem).toHaveBeenCalledWith(
        testItemId,
        expect.objectContaining({
          status: STATUSES.FAILED,
        }),
      );
    });

    it('should add error diff to log if present', () => {
      const testCase = createMockTestCase({
        id: testTaskId,
        state: TASK_STATUS.failed,
        errors: [
          {
            message: 'Assertion failed',
            stack: 'Error: Assertion failed',
            diff: '- expected\n+ received',
          },
        ],
      });

      reporter.onTestCaseResult(testCase);

      expect(reporter.client.sendLog).toHaveBeenCalledTimes(2);
    });

    it('should extend description with error when extendTestDescriptionWithLastError is true', () => {
      reporter.config.extendTestDescriptionWithLastError = true;
      const testCase = createMockTestCase({
        id: testTaskId,
        state: TASK_STATUS.failed,
        errors: [{ message: 'Test failed', stack: 'Error stack' }],
      });

      reporter.onTestCaseResult(testCase);

      expect(reporter.client.finishTestItem).toHaveBeenCalledWith(
        testItemId,
        expect.objectContaining({
          description: expect.stringContaining('Test failed'),
        }),
      );
    });

    it('should mark test item as finishSend after finishing', () => {
      const testCase = createMockTestCase({ id: testTaskId, state: TASK_STATUS.passed });

      reporter.onTestCaseResult(testCase);

      const testItem = reporter.testItems.get(testTaskId);
      expect(testItem?.finishSend).toBe(true);
    });
  });

  describe('onTestRunEnd', () => {
    it('should finish launch and clear state', async () => {
      reporter.config.launchId = undefined;
      const launchIdToFinish = reporter.launchId;
      reporter.promises = [Promise.resolve()];
      reporter.testItems.set('test', { id: 'testId' });

      await reporter.onTestRunEnd();

      expect(reporter.client.finishLaunch).toHaveBeenCalledWith(launchIdToFinish, {
        endTime: mockedDate,
      });
      expect(reporter.launchId).toBeNull();
      expect(reporter.testItems.size).toBe(0);
    });

    it('should not finish launch if launchId is provided in config', async () => {
      reporter.config.launchId = 'existingLaunchId';

      await reporter.onTestRunEnd();

      expect(reporter.client.finishLaunch).not.toHaveBeenCalled();
    });

    it('should wait for all promises to resolve', async () => {
      let resolved = false;
      const delayedPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          resolved = true;
          resolve();
        }, 10);
      });
      reporter.promises = [delayedPromise];

      await reporter.onTestRunEnd();

      expect(resolved).toBe(true);
    });
  });
});
