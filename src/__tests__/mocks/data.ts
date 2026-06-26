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
import type { Vitest, TestCase, TestSuite, TestModule } from 'vitest/node';
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

// Vitest v4 mock factories

interface MockTestCaseOptions {
  id?: string;
  name?: string;
  mode?: 'run' | 'only' | 'skip' | 'todo';
  state?: string;
  startTime?: number;
  duration?: number;
  errors?: Array<{ message?: string; stack?: string; diff?: string }>;
  meta?: unknown;
}

export function createMockTestCase(options: MockTestCaseOptions = {}): TestCase {
  const {
    id = 'testId',
    name = 'test name',
    mode = 'run',
    state = 'passed',
    startTime,
    duration,
    errors,
    meta: metaValue,
  } = options;

  return {
    type: 'test' as const,
    id,
    name,
    options: {
      mode,
      each: false,
      fails: false,
      concurrent: false,
      shuffle: false,
      retry: undefined,
      repeats: undefined,
      timeout: undefined,
      tags: undefined,
    },
    result: jest.fn().mockReturnValue({ state, errors }),
    diagnostic: jest.fn().mockReturnValue(
      startTime !== undefined && duration !== undefined ? { startTime, duration } : undefined,
    ),
    meta: jest.fn().mockReturnValue(metaValue ?? {}),
  } as unknown as TestCase;
}

interface MockTestSuiteOptions {
  id?: string;
  name?: string;
  mode?: 'run' | 'only' | 'skip' | 'todo';
  state?: string;
  children?: (TestCase | TestSuite)[];
  errors?: Array<{ message?: string }>;
}

export function createMockTestSuite(options: MockTestSuiteOptions = {}): TestSuite {
  const {
    id = 'suiteId',
    name = 'suite name',
    mode = 'run',
    state = 'passed',
    children = [],
    errors,
  } = options;

  return {
    type: 'suite' as const,
    id,
    name,
    options: {
      mode,
      each: false,
      fails: false,
      concurrent: false,
      shuffle: false,
      retry: undefined,
      repeats: undefined,
      timeout: undefined,
      tags: undefined,
    },
    state: jest.fn().mockReturnValue(state),
    errors: jest.fn().mockReturnValue(errors ?? []),
    children,
  } as unknown as TestSuite;
}

interface MockTestModuleOptions {
  id?: string;
  moduleId?: string;
  relativeModuleId?: string;
  state?: string;
  children?: (TestCase | TestSuite)[];
}

export function createMockTestModule(options: MockTestModuleOptions = {}): TestModule {
  const {
    id = 'moduleId',
    moduleId = '/test/root/src/test.spec.ts',
    relativeModuleId = 'src/test.spec.ts',
    state = 'passed',
    children = [],
  } = options;

  return {
    type: 'module' as const,
    id,
    moduleId,
    relativeModuleId,
    state: jest.fn().mockReturnValue(state),
    errors: jest.fn().mockReturnValue([]),
    children,
  } as unknown as TestModule;
}
