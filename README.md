# @reportportal/agent-js-vitest

Agent to integrate Vitest with ReportPortal.
* More about [Vitest](https://vitest.dev/)
* More about [ReportPortal](http://reportportal.io/)

## Installation
Install the agent in your project:
```cmd
npm install --save-dev @reportportal/agent-js-vitest
```

## Configuration

**1.** Create `vitest.config.ts` file with ReportPortal configuration:
```typescript
  import { defineConfig } from 'vitest/config';
  import RPReporter from '@reportportal/agent-js-vitest'; // or import { RPReporter } from '@reportportal/agent-js-vitest';

  const rpConfig = {
    apiKey: '00000000-0000-0000-0000-000000000000',
    endpoint: 'https://your.reportportal.server/api/v2',
    project: 'Your ReportPortal project name',
    launch: 'Your launch name',
    attributes: [
      {
        key: 'key',
        value: 'value',
      },
      {
        value: 'value',
      },
    ],
    description: 'Your launch description',
  };

  export default defineConfig({
    test: {
      // add setup file to be able to use ReportingApi via `this.ReportingApi` in your tests
      setupFiles: ["@reportportal/agent-js-vitest/setup"],
      reporters: ['default', new RPReporter(rpConfig)],
    },
  });
```

The full list of available options presented below.

| Option                                      | Necessity  | Default   | Description                                                                                                                                                                                                                                                                                                                                                                              |
|---------------------------------------------|------------|-----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| apiKey                                      | Required   |           | User's ReportPortal token from which you want to send requests. It can be found on the profile page of this user.                                                                                                                                                                                                                                                                        |
| endpoint                                    | Required   |           | URL of your server. For example 'https://server:8080/api/v2'.                                                                                                                                                                                                                                                                                                                            |
| launch                                      | Required   |           | Name of launch at creation.                                                                                                                                                                                                                                                                                                                                                              |
| project                                     | Required   |           | The name of the project in which the launches will be created.                                                                                                                                                                                                                                                                                                                           |
| attributes                                  | Optional   | []        | Launch attributes.                                                                                                                                                                                                                                                                                                                                                                       |
| description                                 | Optional   | ''        | Launch description.                                                                                                                                                                                                                                                                                                                                                                      |
| rerun                                       | Optional   | false     | Enable [rerun](https://reportportal.io/docs/dev-guides/RerunDevelopersGuide)                                                                                                                                                                                                                                                                                                             |
| rerunOf                                     | Optional   | Not set   | UUID of launch you want to rerun. If not specified, ReportPortal will update the latest launch with the same name                                                                                                                                                                                                                                                                        |
| mode                                        | Optional   | 'DEFAULT' | Results will be submitted to Launches page <br/> *'DEBUG'* - Results will be submitted to Debug page.                                                                                                                                                                                                                                                                                    |
| debug                                       | Optional   | false     | This flag allows seeing the logs of the client-javascript. Useful for debugging.                                                                                                                                                                                                                                                                                                         |
| launchId                                    | Optional   | Not set   | The _ID_ of an already existing launch. The launch must be in 'IN_PROGRESS' status while the tests are running. Please note that if this _ID_ is provided, the launch will not be finished at the end of the run and must be finished separately.                                                                                                                                        |                            
| restClientConfig                            | Optional   | Not set   | The object with `agent` property for configure [http(s)](https://nodejs.org/api/https.html#https_https_request_url_options_callback) client, may contain other client options eg. [`timeout`](https://github.com/reportportal/client-javascript#timeout-30000ms-on-axios-requests). <br/> Visit [client-javascript](https://github.com/reportportal/client-javascript) for more details. |
| launchUuidPrint                             | Optional   | false     | Whether to print the current launch UUID.                                                                                                                                                                                                                                                                                                                                                |
| launchUuidPrintOutput                       | Optional   | 'STDOUT'  | Launch UUID printing output. Possible values: 'STDOUT', 'STDERR'. Works only if `launchUuidPrint` set to `true`.                                                                                                                                                                                                                                                                         |
| extendTestDescriptionWithLastError          | Optional   | true      | If set to `true` the latest error log will be attached to the test case description. |

The following options can be overridden using ENVIRONMENT variables:

| Option      | ENV variable    |
|-------------|-----------------|
| launchId    | RP_LAUNCH_ID    |

**2.** Add script to `package.json` file:
```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

## Reporting

When organizing tests, specify titles for `describe` blocks, as this is necessary to build the correct structure of reports.

### Logging

You can use the following `console` native methods to report logs to the tests:

```typescript
console.log();
console.info();
console.debug();
console.warn();
console.error();
```

console's `log`, `info`,`dubug` reports as info log.

console's `error`, `warn` reports as error log if message contains _error_ mention, otherwise as warn log.

### Reporting API

This reporter provides Reporting API to use it directly in tests to send some additional data to the report.

To start using the `ReportingApi` in tests, you can:
- Add setup file in `vitest.config.ts` 
  ```javascript
    import { defineConfig } from 'vitest/config';
  
    export default defineConfig({
      test: {
        ...
        setupFiles: ["@reportportal/agent-js-vitest/setup"],
      },
    });
  ```
  `ReportingApi` will be available in global variables and supports receiving Vitest `task` from the `setup` file.  
  ```javascript
      test('should contain logs with attachments',() => {
        ...
        ReportingApi.attachment({ name, type, content }, 'Description');
        ...
      });
  ```

- Import `ReportingApi` directly from `'@reportportal/agent-js-vitest'`:
  ```javascript
  import { ReportingApi } from '@reportportal/agent-js-vitest';
  ```
  In this case you are required to pass Vitest `task` as the first argument to the `ReportingApi` methods.
  ```javascript
      test('should contain logs with attachments',({ task }) => {
        ...
        ReportingApi.attachment(task, { name, type, content }, 'Description');
        ...
      });
  ```

#### Reporting API methods

The API provides methods for attaching data.<br/>

##### attachment

Send file to ReportPortal for the current test. Should be called inside of corresponding test.<br/>
`ReportingApi.attachment(task: vitest.Task, data: Attachment, description?: string);`<br/>
**required**: `task`, `data`<br/>
**optional**: `description`<br/>
where `Attachment` type is `{name: string; type: string; content: string | Buffer;}`<br/>
Example:
```javascript
test('should contain logs with attachments',({ task }) => {
  const fileName = 'test.jpg';
  const fileContent = fs.readFileSync(path.resolve(__dirname, './attachments', fileName));

  ReportingApi.attachment(task, {
    name: fileName,
    type: 'image/png',
    content: fileContent.toString('base64'),
  }, 'Description');

  expect(true).toBe(true);
});
```

##### testCaseId
Add testCaseId to ReportPortal for the current test. Should be called inside of corresponding test.<br/>
`ReportingApi.testCaseId(task: vitest.Task, data: string);`<br/>
**required**: `task`, `data`<br/>
Example:
```javascript
test('should contain testCaseId',({ task }) => {
  ReportingApi.testCaseId(task, 'C123456');

  expect(true).toBe(true);
});
```

##### description
Add description to ReportPortal for the current test. In case the user call the method more than one time, the existing description will be extended. Should be called inside of corresponding test.<br/>
`ReportingApi.description(task: vitest.Task, data: string);`<br/>
**required**: `task`, `data`<br/>
Example:
```javascript
test('should contain description',({ task }) => {
  ReportingApi.description(task, 'Test Description');

  expect(true).toBe(true);
});
```

##### attributes
Send file to ReportPortal for the current test. Should be called inside of corresponding test.<br/>
`ReportingApi.attributes(task: vitest.Task, data: Attribute[]);`<br/>
**required**: `task`, `data`<br/>
where `Attribute` type is `{ value: string; key?: string; system?: boolean; }`<br/>
Example:
```javascript
test('should contain attributes',({ task }) => {
  ReportingApi.attributes(task,
    [
      { key: 'attrKey1', value: 'attrValue1'},
      { value: 'attrValue2'}
    ]);

  expect(true).toBe(true);
});
```
