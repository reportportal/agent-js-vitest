import { ReportPortalConfig } from '../../models';

const mockedDate = Date.now();
export class RPClientMock {
  private config: ReportPortalConfig;

  constructor(config?: ReportPortalConfig) {
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

  public helpers = {
    now: (): number => mockedDate,
  };

  public checkConnect = jest.fn().mockReturnValue({
    promise: Promise.resolve('ok'),
  });
}
