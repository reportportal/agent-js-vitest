import type { RunnerTaskResultPack, RunnerTestFile, UserConsoleLog } from 'vitest';
import clientHelpers from '@reportportal/client-javascript/lib/helpers';
import { RPReporter } from '../reporter';
import { config } from './mocks/configMock';
import { RPClientMock, mockedDate } from './mocks/RPClientMock';
import {
  getVitestInstance,
  createMockTestTask,
  createMockSuiteTask,
  createMockTaskResult,
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

  describe('onCollected', () => {
    beforeEach(() => {
      reporter.rootDir = '/test/root';
    });

    it('should start test items for collected files', () => {
      const files: RunnerTestFile[] = [
        {
          id: 'file1',
          name: 'test.spec.ts',
          type: 'suite',
          mode: 'run',
          filepath: '/test/root/src/test.spec.ts',
          tasks: [],
          meta: {},
          projectName: 'test',
          pool: 'forks',
          collectDuration: 0,
          setupDuration: 0,
          importDurations: {},
          get file() {
            return this;
          },
        },
      ];

      reporter.onCollected(files);

      expect(reporter.client.startTestItem).toHaveBeenCalled();
    });

    it('should handle empty files array', () => {
      reporter.onCollected([]);

      expect(reporter.client.startTestItem).not.toHaveBeenCalled();
    });

    it('should handle undefined files', () => {
      reporter.onCollected(undefined);

      expect(reporter.client.startTestItem).not.toHaveBeenCalled();
    });
  });

  describe('startDescendants', () => {
    beforeEach(() => {
      reporter.rootDir = '/test/root';
    });

    it('should finish skipped tests immediately', () => {
      const skippedTask = createMockTestTask({
        id: 'skippedTest',
        name: 'skipped test',
        mode: 'skip',
      });

      reporter.startDescendants(skippedTask, '/src/test.ts');

      expect(reporter.client.finishTestItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: STATUSES.SKIPPED,
        }),
      );
    });

    it('should finish todo tests with todo attribute', () => {
      const todoTask = createMockTestTask({
        id: 'todoTest',
        name: 'todo test',
        mode: 'todo',
      });

      reporter.startDescendants(todoTask, '/src/test.ts');

      expect(reporter.client.finishTestItem).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status: STATUSES.SKIPPED,
          attributes: [{ value: TASK_MODE.todo }],
        }),
      );
    });

    it('should add test item to testItems map for run mode', () => {
      const runTask = createMockTestTask({
        id: 'runTest',
        name: 'running test',
        mode: 'run',
      });

      reporter.startDescendants(runTask, '/src/test.ts');

      expect(reporter.testItems.has('runTest')).toBe(true);
    });

    it('should recursively start descendants for suite', () => {
      const innerTask = createMockTestTask({
        id: 'test1',
        name: 'test 1',
        mode: 'run',
      });
      const suiteTask = createMockSuiteTask({
        id: 'suite1',
        name: 'test suite',
        mode: 'run',
        tasks: [innerTask],
      });

      reporter.startDescendants(suiteTask, '/src/test.ts');

      expect(reporter.client.startTestItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFinishTestItemObj', () => {
    it('should return failed status when no task result', () => {
      const result = reporter.getFinishTestItemObj();

      expect(result.status).toBe(STATUSES.FAILED);
      expect(result.endTime).toBe(mockedDate);
    });

    it('should return passed status for passed task', () => {
      const taskResult = createMockTaskResult({
        state: TASK_STATUS.pass,
        startTime: 1000,
        duration: 500,
      });

      const result = reporter.getFinishTestItemObj(taskResult);

      expect(result.status).toBe(STATUSES.PASSED);
      expect(result.endTime).toBe(1500);
    });

    it('should return failed status for failed task', () => {
      const taskResult = createMockTaskResult({
        state: TASK_STATUS.fail,
        startTime: 1000,
        duration: 500,
      });

      const result = reporter.getFinishTestItemObj(taskResult);

      expect(result.status).toBe(STATUSES.FAILED);
      expect(result.endTime).toBe(1500);
    });

    it('should return skipped status for skipped task', () => {
      const taskResult = createMockTaskResult({
        state: TASK_MODE.skip,
      });

      const result = reporter.getFinishTestItemObj(taskResult);

      expect(result.status).toBe(STATUSES.SKIPPED);
    });

    it('should use clientHelpers.now() when startTime or duration is not finite', () => {
      const taskResult = createMockTaskResult({
        state: TASK_STATUS.pass,
        startTime: NaN,
        duration: NaN,
      });

      const result = reporter.getFinishTestItemObj(taskResult);

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

  describe('onTaskUpdate', () => {
    const testTaskId = 'testTaskId';
    const testItemId = 'testId';

    beforeEach(() => {
      reporter.testItems.set(testTaskId, { id: testItemId });
    });

    it('should not finish test if already finished', () => {
      reporter.testItems.set(testTaskId, { id: testItemId, finishSend: true });
      const taskResult = createMockTaskResult({ state: TASK_STATUS.pass });
      const packs: RunnerTaskResultPack[] = [[testTaskId, taskResult, {}]];

      reporter.onTaskUpdate(packs);

      expect(reporter.client.finishTestItem).not.toHaveBeenCalled();
    });

    it('should not finish test if state is not in FINISHED_STATES', () => {
      const taskResult = createMockTaskResult({ state: 'run' });
      const packs: RunnerTaskResultPack[] = [[testTaskId, taskResult, {}]];

      reporter.onTaskUpdate(packs);

      expect(reporter.client.finishTestItem).not.toHaveBeenCalled();
    });

    it('should handle task with errors', () => {
      const taskResult = createMockTaskResult({
        state: TASK_STATUS.fail,
        errors: [{ message: 'Test failed', stack: 'Error: Test failed\n    at test.ts:10' }],
      });
      const packs: RunnerTaskResultPack[] = [[testTaskId, taskResult, {}]];

      reporter.onTaskUpdate(packs);

      expect(reporter.client.sendLog).toHaveBeenCalled();
      expect(reporter.client.finishTestItem).toHaveBeenCalledWith(
        testItemId,
        expect.objectContaining({
          status: STATUSES.FAILED,
        }),
      );
    });

    it('should add error diff to log if present', () => {
      const taskResult = createMockTaskResult({
        state: TASK_STATUS.fail,
        errors: [
          {
            message: 'Assertion failed',
            stack: 'Error: Assertion failed',
            diff: '- expected\n+ received',
          },
        ],
      });
      const packs: RunnerTaskResultPack[] = [[testTaskId, taskResult, {}]];

      reporter.onTaskUpdate(packs);

      // Should send two logs: one for error stack, one for diff
      expect(reporter.client.sendLog).toHaveBeenCalledTimes(2);
    });

    it('should extend description with error when extendTestDescriptionWithLastError is true', () => {
      reporter.config.extendTestDescriptionWithLastError = true;
      const taskResult = createMockTaskResult({
        state: TASK_STATUS.fail,
        errors: [{ message: 'Test failed', stack: 'Error stack' }],
      });
      const packs: RunnerTaskResultPack[] = [[testTaskId, taskResult, {}]];

      reporter.onTaskUpdate(packs);

      expect(reporter.client.finishTestItem).toHaveBeenCalledWith(
        testItemId,
        expect.objectContaining({
          description: expect.stringContaining('Test failed'),
        }),
      );
    });

    it('should mark test item as finishSend after finishing', () => {
      const taskResult = createMockTaskResult({ state: TASK_STATUS.pass });
      const packs: RunnerTaskResultPack[] = [[testTaskId, taskResult, {}]];

      reporter.onTaskUpdate(packs);

      const testItem = reporter.testItems.get(testTaskId);
      expect(testItem?.finishSend).toBe(true);
    });
  });

  describe('onFinished', () => {
    it('should finish launch and clear state', async () => {
      reporter.config.launchId = undefined;
      const launchIdToFinish = reporter.launchId;
      reporter.promises = [Promise.resolve()];
      reporter.testItems.set('test', { id: 'testId' });

      await reporter.onFinished();

      expect(reporter.client.finishLaunch).toHaveBeenCalledWith(launchIdToFinish, {
        endTime: mockedDate,
      });
      expect(reporter.launchId).toBeNull();
      expect(reporter.testItems.size).toBe(0);
    });

    it('should not finish launch if launchId is provided in config', async () => {
      reporter.config.launchId = 'existingLaunchId';

      await reporter.onFinished();

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

      await reporter.onFinished();

      expect(resolved).toBe(true);
    });
  });
});
