import * as vitest from 'vitest';
import clientHelpers from '@reportportal/client-javascript/lib/helpers';
import * as Models from './models';
import { isRPTaskMeta } from './utils';

const injectRPTaskMeta = (task: vitest.RunnerTask) => {
  if (isRPTaskMeta(task.meta)) {
    return;
  }

  (task.meta as Models.RPTaskMeta) = {
    ...task.meta,
    rpMeta: {
      test: {
        logs: [],
        attributes: [],
      },
    },
  };
};

const attachment = (task: vitest.RunnerTask, data: Models.Attachment, description?: string) => {
  injectRPTaskMeta(task);
  (task.meta as Models.RPTaskMeta).rpMeta.test.logs.push({
    file: data,
    time: clientHelpers.now(),
    message: description || data.name,
  });
};

const attributes = (task: vitest.RunnerTask, data: Models.Attribute[]) => {
  injectRPTaskMeta(task);
  const rpMeta = (task.meta as Models.RPTaskMeta).rpMeta;
  rpMeta.test.attributes = [...rpMeta.test.attributes, ...data];
};

const testCaseId = (task: vitest.RunnerTask, data: string) => {
  injectRPTaskMeta(task);
  (task.meta as Models.RPTaskMeta).rpMeta.test.testCaseId = data;
};

const description = (task: vitest.RunnerTask, data: string) => {
  injectRPTaskMeta(task);
  const rpMeta = (task.meta as Models.RPTaskMeta).rpMeta;
  if (rpMeta.test.description) {
    rpMeta.test.description = `${rpMeta.test.description}\n${data}`;
  } else {
    rpMeta.test.description = data;
  }
};

const log = (
  task: vitest.RunnerTask,
  message: string,
  level: Models.LOG_LEVELS = Models.PREDEFINED_LOG_LEVELS.INFO,
) => {
  injectRPTaskMeta(task);
  (task.meta as Models.RPTaskMeta).rpMeta.test.logs.push({
    message,
    level,
    time: clientHelpers.now(),
  });
};

export const ReportingApi: Models.ReportingApi = {
  attachment,
  attributes,
  testCaseId,
  description,
  log,
};

export const bindReportingApi = (task: vitest.RunnerTask): Models.GlobalReportingApi => ({
  attachment: (data: Models.Attachment, message?: string) => attachment(task, data, message),
  attributes: (data: Models.Attribute[]) => attributes(task, data),
  testCaseId: (data: string) => testCaseId(task, data),
  description: (data: string) => description(task, data),
  log: (message: string, level: Models.LOG_LEVELS = Models.PREDEFINED_LOG_LEVELS.INFO) =>
    log(task, message, level),
});
