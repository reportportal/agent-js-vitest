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

export const ReportingApi: Models.ReportingApi = {
  attachment,
};
