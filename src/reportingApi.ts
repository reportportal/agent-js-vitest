// eslint-disable-next-line import/named
import { Task } from 'vitest';
import * as Models from './models';
import { isRPTaskMeta } from './utils';

const injectRPTaskMeta = (task: Task) => {
  if (isRPTaskMeta(task.meta)) {
    return;
  }

  (task.meta as Models.RPTaskMeta) = {
    ...task.meta,
    test: {
      logs: [],
    },
  };
};

const attachment = (task: Task, data: Models.Attachment, description?: string) => {
  injectRPTaskMeta(task);
  (task.meta as Models.RPTaskMeta).test.logs.push({
    file: data,
    time: Date.now(),
    message: description || data.name,
  });
};

export const ReportingApi: Models.ReportingApi = {
  attachment,
};
