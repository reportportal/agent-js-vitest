import { ReportingApi } from '../reportingApi';

describe('test description reporting', () => {
  let task: any;

  beforeEach(() => {
    task = { meta: {} };
  });

  test('should add description to task meta', () => {
    const description = 'test description';
    ReportingApi.description(task, description);

    expect(task.meta.rpMeta.test.description).toEqual(description);
  });

  test('should append data to existing description in task meta', () => {
    const existingDescription = 'test description';
    task.meta = {
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

    expect(task.meta.rpMeta.test.description).toEqual(existingDescription + '\n' + newDescription);
  });
});
