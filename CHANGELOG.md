### Added
- Vitest 2.x and 3.x versions support.
- `error.message` is now used when extending test description instead of `error.stack` to improve readability, thanks to @lcharlois-neotys.
- `error.diff` is now added to failed item logs to improve failure analysis, thanks to @lcharlois-neotys.
- Allow configuring the HTTP retry strategy via `restClientConfig.retry` and tune the [default policy](https://github.com/reportportal/client-javascript?tab=readme-ov-file#retry-configuration).
### Changed
- Revert time format back to milliseconds (based on [#217](https://github.com/reportportal/client-javascript/issues/217#issuecomment-2659843471)). This is also fixing the issue with agents installation on ARM processors [#212](https://github.com/reportportal/agent-js-cypress/issues/212).
- `@reportportal/client-javascript` bumped to version `5.4.2`.
### Security
- Updated versions of vulnerable packages (axios, form-data).

## [5.1.1] - 2024-09-23
### Added
- Test case id, attributes and description providing via [Reporting API](./README.md#reporting-api-methods).
### Changed
- The agent now supports reporting the time for launches, test items and logs with microsecond precision in the ISO string format.
For logs, microsecond precision is available on the UI from ReportPortal version 24.2.
- `@reportportal/client-javascript` bumped to version `5.3.0`, new `launchUuidPrintOutput` types introduced: 'FILE', 'ENVIRONMENT'.
### Security
- Updated versions of vulnerable packages (braces).

## [5.1.0] - 2024-05-03
### Added
- `ReportingApi` with `attachment` method support.
- `extendTestDescriptionWithLastError` option to the RP config to be able to toggle the last error log attaching to the test description.
### Changed
- `@reportportal/client-javascript` bumped to version `5.1.3`.

## [5.0.0] - 2024-02-15
### Added
- Basic reporting for ReportPortal API version 5.* (see [ReportPortal releases](https://github.com/reportportal/reportportal/releases))
