export enum TASK_MODE {
  run = 'run',
  skip = 'skip',
  only = 'only',
  todo = 'todo',
}

export enum TASK_STATUS {
  passed = 'passed',
  failed = 'failed',
  skipped = 'skipped',
  pending = 'pending',
  queued = 'queued',
}

export const FINISHED_STATES = [TASK_STATUS.passed, TASK_STATUS.failed, TASK_STATUS.skipped];
