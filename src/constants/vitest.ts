export enum TASK_MODE {
  run = 'run',
  skip = 'skip',
  only = 'only',
  todo = 'todo',
}

export enum TASK_STATUS {
  pass = 'pass',
  fail = 'fail',
}

export const FINISHED_STATES = ['pass', 'fail', 'skip'];
