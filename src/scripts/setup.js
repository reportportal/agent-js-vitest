import { afterEach, beforeEach } from 'vitest';
import { bindReportingApi } from '../reportingApi';

beforeEach(async (ctx) => {
  // @ts-ignore
  global.ReportingApi = bindReportingApi(ctx.task);
});

afterEach(() => {
  // @ts-ignore
  global.ReportingApi = undefined;
});
