# @reportportal/agent-js-vitest

Agent to integrate Playwright with ReportPortal.
* More about [Playwright](https://vitest.dev/)
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
      reporters: ['default', new RPReporter(rpConfig)],
    },
  });
```

The full list of available options presented below.

| Option                                      | Necessity  | Default   | Description                                                                                                                                                                                                                                                                                                                                                                              |
|---------------------------------------------|------------|-----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| apiKey                                      | Required   |           | User's ReportPortal token from which you want to send requests. It can be found on the profile page of this user.                                                                                                                                                                                                                                                                        |
| endpoint                                    | Required   |           | URL of your server. For example 'https://server:8080/api/v1'.                                                                                                                                                                                                                                                                                                                            |
| launch                                      | Required   |           | Name of launch at creation.                                                                                                                                                                                                                                                                                                                                                              |
| project                                     | Required   |           | The name of the project in which the launches will be created.                                                                                                                                                                                                                                                                                                                           |
| attributes                                  | Optional   | []        | Launch attributes.                                                                                                                                                                                                                                                                                                                                                                       |
| description                                 | Optional   | ''        | Launch description.                                                                                                                                                                                                                                                                                                                                                                      |
| rerun                                       | Optional   | false     | Enable [rerun](https://reportportal.io/docs/dev-guides/RerunDevelopersGuide)                                                                                                                                                                                                                                                                                                             |
| rerunOf                                     | Optional   | Not set   | UUID of launch you want to rerun. If not specified, ReportPortal will update the latest launch with the same name                                                                                                                                                                                                                                                                        |
| mode                                        | Optional   | 'DEFAULT' | Results will be submitted to Launches page <br/> *'DEBUG'* - Results will be submitted to Debug page.                                                                                                                                                                                                                                                                                    |
| skippedIssue                                | Optional   | true      | ReportPortal provides feature to mark skipped tests as not 'To Investigate'. <br/> Option could be equal boolean values: <br/> *true* - skipped tests considered as issues and will be marked as 'To Investigate' on ReportPortal. <br/> *false* - skipped tests will not be marked as 'To Investigate' on application.                                                                  |
| debug                                       | Optional   | false     | This flag allows seeing the logs of the client-javascript. Useful for debugging.                                                                                                                                                                                                                                                                                                         |
| launchId                                    | Optional   | Not set   | The _ID_ of an already existing launch. The launch must be in 'IN_PROGRESS' status while the tests are running. Please note that if this _ID_ is provided, the launch will not be finished at the end of the run and must be finished separately.                                                                                                                                        |                            
| restClientConfig                            | Optional   | Not set   | The object with `agent` property for configure [http(s)](https://nodejs.org/api/https.html#https_https_request_url_options_callback) client, may contain other client options eg. [`timeout`](https://github.com/reportportal/client-javascript#timeout-30000ms-on-axios-requests). <br/> Visit [client-javascript](https://github.com/reportportal/client-javascript) for more details. |
| launchUuidPrint                             | Optional   | false     | Whether to print the current launch UUID.                                                                                                                                                                                                                                                                                                                                                |
| launchUuidPrintOutput                       | Optional   | 'STDOUT'  | Launch UUID printing output. Possible values: 'STDOUT', 'STDERR'. Works only if `launchUuidPrint` set to `true`.                                                                                                                                                                                                                                                                         |

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

When organizing tests, specify titles for `test.describe` blocks, as this is necessary to build the correct structure of reports.

### Logging

You can use the following `console` native methods to report logs to tests:

```typescript
console.log();
console.info();
console.debug();
console.warn();
console.error();
```

console's `log`, `info`,`dubug` reports as info log.

console's `error`` reports as error log.
