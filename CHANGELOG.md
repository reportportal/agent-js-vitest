### Updated
- Updated Vitest to latest version `3.2.4`.
- Verified compatibility with Vitest major versions 2.x, 3.x

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
