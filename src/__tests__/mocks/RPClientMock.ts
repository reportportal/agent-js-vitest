import { ReportPortalConfig } from '../../models';

export const mockedDate = Date.now();

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
    tempId: 'tempLogId',
  });

  public checkConnect = jest.fn().mockReturnValue({
    promise: Promise.resolve('ok'),
  });

  public updateLaunch = jest.fn().mockReturnValue({
    promise: Promise.resolve('ok'),
    tempId: 'tempLaunchId',
  });

  public getPromiseFinishAllItems = jest.fn().mockResolvedValue('ok');

  public helpers = {
    now: jest.fn().mockReturnValue(Date.now()),
  };
}
