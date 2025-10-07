import { ReportPortalConfig } from '../../models';

export const mockedDate = '2024-09-23T12:20:59.392987Z';
export class RPClientMock {
  private config: ReportPortalConfig;

  constructor(config: ReportPortalConfig) {
    this.config = config;
  }

  public startLaunch = jest.fn().mockReturnValue({
    promise: Promise.resolve('ok'),
    tempId: 'tempLaunchId',
  });

  public finishLaunch = jest.fn().mockReturnValue({
    promise: Promise.resolve('ok'),
  });

  public startTestItem = jest.fn().mockReturnValue({
    promise: Promise.resolve('ok'),
    tempId: 'tempTestItemId',
  });

  public finishTestItem = jest.fn().mockReturnValue({
    promise: Promise.resolve('ok'),
  });

  public sendLog = jest.fn().mockReturnValue({
    promise: Promise.resolve('ok'),
  });

  public checkConnect = jest.fn().mockReturnValue({
    promise: Promise.resolve('ok'),
  });
}
