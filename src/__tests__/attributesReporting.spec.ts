import { ReportingApi } from '../reportingApi';

describe('test attributes reporting', () => {
  let task: any;

  beforeEach(() => {
    task = { meta: {} };
  });

  test('should add attributes to task meta', () => {
    const data = [
      { key: 'key1', value: 'value1' },
      { key: 'key2', value: 'value2' },
    ];
    ReportingApi.attributes(task, data);

    expect(task.meta.rpMeta.test.attributes).toEqual(data);
  });

  test('should append attributes to existing attributes in task meta', () => {
    const existingAttributes = [{ key: 'existingKey', value: 'existingValue' }];
    task.meta = {
      rpMeta: {
        test: {
          logs: [],
          attributes: existingAttributes,
        },
      },
    };
    const newAttributes = [{ key: 'newKey', value: 'newValue' }];
    ReportingApi.attributes(task, newAttributes);

    expect(task.meta.rpMeta.test.attributes).toEqual([...existingAttributes, ...newAttributes]);
  });
});
