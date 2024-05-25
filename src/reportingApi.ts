import * as vitest from 'vitest';
import * as Models from './models';
import { isRPTaskMeta } from './utils';

const injectRPTaskMeta = (task: vitest.Task) => {
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

const attachment = (task: vitest.Task, data: Models.Attachment, description?: string) => {
  injectRPTaskMeta(task);
  (task.meta as Models.RPTaskMeta).rpMeta.test.logs.push({
    file: data,
    time: Date.now(),
    message: description || data.name,
  });
};

const attributes = (task: vitest.Task, data: Models.Attribute[]) => {
  injectRPTaskMeta(task);
  const rpMeta = (task.meta as Models.RPTaskMeta).rpMeta;
  rpMeta.test.attributes = [...rpMeta.test.attributes, ...data];
};

const testCaseId = (task: vitest.Task, data: string) => {
  injectRPTaskMeta(task);
  (task.meta as Models.RPTaskMeta).rpMeta.test.testCaseId = data;
};

const description = (task: vitest.Task, data: string) => {
  injectRPTaskMeta(task);
  const rpMeta = (task.meta as Models.RPTaskMeta).rpMeta;
  if (rpMeta.test.description) {
    rpMeta.test.description = `${rpMeta.test.description}\n${data}`;
  } else {
    rpMeta.test.description = data;
  }
};

export const ReportingApi: Models.ReportingApi = {
  attachment,
  attributes,
  testCaseId,
  description,
};

export const bindReportingApi = (task: vitest.Task): Models.GlobalReportingApi => ({
  attachment: (data: Models.Attachment, message?: string) => attachment(task, data, message),
  attributes: (data: Models.Attribute[]) => attributes(task, data),
  testCaseId: (data: string) => testCaseId(task, data),
  description: (data: string) => testCaseId(task, data),
});
