import type { RunnerTask } from 'vitest';
import clientHelpers from '@reportportal/client-javascript/lib/helpers';
import { ReportingApi, bindReportingApi } from '../reportingApi';
import { getTask } from './mocks/data';
import { mockedDate } from './mocks/RPClientMock';
import { RPTaskMeta, PREDEFINED_LOG_LEVELS } from '../models';

describe('ReportingApi', () => {
  jest.spyOn(clientHelpers, 'now').mockReturnValue(mockedDate);

  let task: RunnerTask;

  beforeEach(() => {
    task = getTask();
  });

  describe('attachment', () => {
    it('should add attachment to task meta logs', () => {
      const attachmentData = {
        name: 'screenshot.png',
        type: 'image/png',
        content: 'base64content',
      };

      ReportingApi.attachment(task, attachmentData);

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.logs).toHaveLength(1);
      expect(meta.rpMeta.test.logs[0]).toEqual({
        file: attachmentData,
        time: mockedDate,
        message: 'screenshot.png',
      });
    });

    it('should add attachment with custom description', () => {
      const attachmentData = {
        name: 'screenshot.png',
        type: 'image/png',
        content: 'base64content',
      };
      const description = 'Custom description for attachment';

      ReportingApi.attachment(task, attachmentData, description);

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.logs[0].message).toBe(description);
    });

    it('should append attachments to existing logs', () => {
      const existingLogs = [{ message: 'existing log', time: mockedDate }];
      (task.meta as RPTaskMeta) = {
        rpMeta: {
          test: {
            logs: existingLogs,
            attributes: [],
          },
        },
      };

      const attachmentData = {
        name: 'new-screenshot.png',
        type: 'image/png',
        content: 'base64content',
      };

      ReportingApi.attachment(task, attachmentData);

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.logs).toHaveLength(2);
    });
  });

  describe('log', () => {
    it('should add log message to task meta', () => {
      const message = 'Test log message';

      ReportingApi.log(task, message);

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.logs).toHaveLength(1);
      expect(meta.rpMeta.test.logs[0]).toEqual({
        message,
        level: PREDEFINED_LOG_LEVELS.INFO,
        time: mockedDate,
      });
    });

    it('should add log with custom level', () => {
      const message = 'Error message';
      const level = PREDEFINED_LOG_LEVELS.ERROR;

      ReportingApi.log(task, message, level);

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.logs[0].level).toBe(PREDEFINED_LOG_LEVELS.ERROR);
    });

    it('should add log with WARN level', () => {
      const message = 'Warning message';
      const level = PREDEFINED_LOG_LEVELS.WARN;

      ReportingApi.log(task, message, level);

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.logs[0].level).toBe(PREDEFINED_LOG_LEVELS.WARN);
    });

    it('should add log with DEBUG level', () => {
      const message = 'Debug message';
      const level = PREDEFINED_LOG_LEVELS.DEBUG;

      ReportingApi.log(task, message, level);

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.logs[0].level).toBe(PREDEFINED_LOG_LEVELS.DEBUG);
    });

    it('should append logs to existing logs', () => {
      (task.meta as RPTaskMeta) = {
        rpMeta: {
          test: {
            logs: [{ message: 'existing log', time: mockedDate }],
            attributes: [],
          },
        },
      };

      ReportingApi.log(task, 'New log message');

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.logs).toHaveLength(2);
    });
  });

  describe('attributes', () => {
    it('should add attributes to task meta', () => {
      const data = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ];

      ReportingApi.attributes(task, data);

      expect((task.meta as RPTaskMeta).rpMeta.test.attributes).toEqual(data);
    });

    it('should append attributes to existing attributes', () => {
      const existingAttributes = [{ key: 'existingKey', value: 'existingValue' }];
      (task.meta as RPTaskMeta) = {
        rpMeta: {
          test: {
            logs: [],
            attributes: existingAttributes,
          },
        },
      };
      const newAttributes = [{ key: 'newKey', value: 'newValue' }];

      ReportingApi.attributes(task, newAttributes);

      expect((task.meta as RPTaskMeta).rpMeta.test.attributes).toEqual([
        ...existingAttributes,
        ...newAttributes,
      ]);
    });

    it('should handle attributes without key', () => {
      const data = [{ value: 'tagValue' }];

      ReportingApi.attributes(task, data);

      expect((task.meta as RPTaskMeta).rpMeta.test.attributes).toEqual(data);
    });
  });

  describe('testCaseId', () => {
    it('should set test case id to task meta', () => {
      const testCaseId = 'test_case_id';

      ReportingApi.testCaseId(task, testCaseId);

      expect((task.meta as RPTaskMeta).rpMeta.test.testCaseId).toEqual(testCaseId);
    });

    it('should overwrite test case id', () => {
      (task.meta as RPTaskMeta) = {
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

      expect((task.meta as RPTaskMeta).rpMeta.test.testCaseId).toEqual(newTestCaseId);
    });
  });

  describe('description', () => {
    it('should add description to task meta', () => {
      const description = 'test description';

      ReportingApi.description(task, description);

      expect((task.meta as RPTaskMeta).rpMeta.test.description).toEqual(description);
    });

    it('should append to existing description', () => {
      const existingDescription = 'test description';
      (task.meta as RPTaskMeta) = {
        rpMeta: {
          test: {
            logs: [],
            attributes: [],
            description: existingDescription,
          },
        },
      };
      const newDescription = 'new test description';

      ReportingApi.description(task, newDescription);

      expect((task.meta as RPTaskMeta).rpMeta.test.description).toEqual(
        existingDescription + '\n' + newDescription,
      );
    });
  });
});

describe('bindReportingApi', () => {
  jest.spyOn(clientHelpers, 'now').mockReturnValue(mockedDate);

  let task: RunnerTask;

  beforeEach(() => {
    task = getTask();
  });

  it('should return bound API methods', () => {
    const boundApi = bindReportingApi(task);

    expect(boundApi.attachment).toBeInstanceOf(Function);
    expect(boundApi.attributes).toBeInstanceOf(Function);
    expect(boundApi.testCaseId).toBeInstanceOf(Function);
    expect(boundApi.description).toBeInstanceOf(Function);
    expect(boundApi.log).toBeInstanceOf(Function);
  });

  describe('bound attachment', () => {
    it('should add attachment using bound method', () => {
      const boundApi = bindReportingApi(task);
      const attachmentData = {
        name: 'test.png',
        type: 'image/png',
        content: 'content',
      };

      boundApi.attachment(attachmentData);

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.logs).toHaveLength(1);
      expect(meta.rpMeta.test.logs[0].file).toEqual(attachmentData);
    });

    it('should add attachment with message using bound method', () => {
      const boundApi = bindReportingApi(task);
      const attachmentData = {
        name: 'test.png',
        type: 'image/png',
        content: 'content',
      };

      boundApi.attachment(attachmentData, 'Custom message');

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.logs[0].message).toBe('Custom message');
    });
  });

  describe('bound attributes', () => {
    it('should add attributes using bound method', () => {
      const boundApi = bindReportingApi(task);
      const attributes = [{ key: 'key', value: 'value' }];

      boundApi.attributes(attributes);

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.attributes).toEqual(attributes);
    });
  });

  describe('bound testCaseId', () => {
    it('should set testCaseId using bound method', () => {
      const boundApi = bindReportingApi(task);

      boundApi.testCaseId('TC-123');

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.testCaseId).toBe('TC-123');
    });
  });

  describe('bound description', () => {
    it('should set description using bound method', () => {
      const boundApi = bindReportingApi(task);

      boundApi.description('Test description');

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.description).toBe('Test description');
    });
  });

  describe('bound log', () => {
    it('should add log using bound method with default level', () => {
      const boundApi = bindReportingApi(task);

      boundApi.log('Log message');

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.logs).toHaveLength(1);
      expect(meta.rpMeta.test.logs[0]).toEqual({
        message: 'Log message',
        level: PREDEFINED_LOG_LEVELS.INFO,
        time: mockedDate,
      });
    });

    it('should add log using bound method with custom level', () => {
      const boundApi = bindReportingApi(task);

      boundApi.log('Error message', PREDEFINED_LOG_LEVELS.ERROR);

      const meta = task.meta as RPTaskMeta;
      expect(meta.rpMeta.test.logs[0].level).toBe(PREDEFINED_LOG_LEVELS.ERROR);
    });
  });
});
