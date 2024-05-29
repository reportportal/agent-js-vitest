import { ReportingApi } from '../reportingApi';
import * as vitest from 'vitest';
import { getTask } from './mocks/data';
import { RPTaskMeta } from '../models';

describe('test attributes reporting', () => {
  let task: vitest.Task;

  beforeEach(() => {
    task = getTask();
  });

  test('should add attributes to task meta', () => {
    const data = [
      { key: 'key1', value: 'value1' },
      { key: 'key2', value: 'value2' },
    ];
    ReportingApi.attributes(task, data);

    expect((task.meta as RPTaskMeta).rpMeta.test.attributes).toEqual(data);
  });

  test('should append attributes to existing attributes in task meta', () => {
    const existingAttributes = [{ key: 'existingKey', value: 'existingValue' }];
    const rpMeta: RPTaskMeta = {
      rpMeta: {
        test: {
          logs: [],
          attributes: existingAttributes,
        },
      },
    };
    task.meta = rpMeta;
    const newAttributes = [{ key: 'newKey', value: 'newValue' }];
    ReportingApi.attributes(task, newAttributes);

    expect((task.meta as RPTaskMeta).rpMeta.test.attributes).toEqual([
      ...existingAttributes,
      ...newAttributes,
    ]);
  });
});
