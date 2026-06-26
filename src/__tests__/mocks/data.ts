import type {
  RunnerTask,
  RunnerTaskResult,
  RunnerTestSuite,
  RunnerTestFile,
  RunnerTestCase,
  RunMode,
  TaskState,
  TaskMeta,
} from 'vitest';
import type { Vitest } from 'vitest/node';
import type { TestError } from '@vitest/utils';

export function getVitestInstance(root = '/test/root'): Vitest {
  return {
    config: {
      root,
    },
  } as Vitest;
}

function createMockFile(): RunnerTestFile {
  const file: RunnerTestFile = {
    id: 'file-id',
    name: 'test.ts',
    fullName: '/test.ts',
    type: 'suite',
    mode: 'run',
    meta: {},
    tasks: [],
    filepath: '/test.ts',
    projectName: 'testProject',
    pool: 'forks',
    collectDuration: 0,
    setupDuration: 0,
    importDurations: {},
    get file(): RunnerTestFile {
      return this;
    },
  };
  return file;
}

export function getTask(): RunnerTask {
  const suite: RunnerTestSuite = {
    id: 'id',
    name: 'task',
    fullName: '/test.ts > task',
    type: 'suite',
    mode: 'run',
    meta: {},
    tasks: [],
    file: createMockFile(),
  };

  return suite;
}

interface MockTestTaskOptions {
  id?: string;
  name?: string;
  mode?: RunMode;
  meta?: TaskMeta;
}

export function createMockTestTask(options: MockTestTaskOptions = {}): RunnerTestCase {
  const file = createMockFile();
  return {
    artifacts: [],
    fullName: '',
    fullTestName: '',
    id: options.id ?? 'testId',
    name: options.name ?? 'test name',
    type: 'test',
    mode: options.mode ?? 'run',
    meta: options.meta ?? {},
    file,
    context: {} as RunnerTestCase['context'],
    timeout: 5000,
    annotations: [],
  };
}

interface MockSuiteTaskOptions {
  id?: string;
  name?: string;
  mode?: RunMode;
  meta?: TaskMeta;
  tasks?: RunnerTask[];
}

export function createMockSuiteTask(options: MockSuiteTaskOptions = {}): RunnerTestSuite {
  const file = createMockFile();
  return {
    fullName: '',
    id: options.id ?? 'suiteId',
    name: options.name ?? 'suite name',
    type: 'suite',
    mode: options.mode ?? 'run',
    meta: options.meta ?? {},
    file,
    tasks: options.tasks ?? [],
  };
}

interface MockErrorOptions {
  message: string;
  stack?: string;
  diff?: string;
}

interface MockTaskResultOptions {
  state?: TaskState;
  startTime?: number;
  duration?: number;
  errors?: MockErrorOptions[];
}

export function createMockTaskResult(options: MockTaskResultOptions = {}): RunnerTaskResult {
  const errors: TestError[] | undefined = options.errors?.map((err) => ({
    message: err.message,
    stack: err.stack,
    diff: err.diff,
  }));

  return {
    state: options.state ?? 'pass',
    startTime: options.startTime ?? Date.now(),
    duration: options.duration ?? 100,
    errors,
    retryCount: 0,
    repeatCount: 0,
  };
}
