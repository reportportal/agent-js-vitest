/*
 *  Copyright 2024 EPAM Systems
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

import RPClient from '@reportportal/client-javascript';
import clientHelpers from '@reportportal/client-javascript/lib/helpers';
import type { UserConsoleLog } from 'vitest';
import type { Reporter } from 'vitest/reporters';
import type { Vitest, TestModule, TestSuite, TestCase } from 'vitest/node';
import {
  Attribute,
  FinishTestItemObjType,
  LogRQ,
  ReportPortalConfig,
  StartLaunchObjType,
  StartTestObjType,
} from './models';
import {
  getAgentInfo,
  getSystemAttributes,
  promiseErrorHandler,
  getCodeRef,
  getBasePath,
  isErrorLog,
  isRPTaskMeta,
} from './utils';
import {
  LAUNCH_MODES,
  PREDEFINED_LOG_LEVELS,
  STATUSES,
  TEST_ITEM_TYPES,
  TASK_MODE,
  TASK_STATUS,
} from './constants';

type ReportedEntity = TestModule | TestSuite | TestCase;

const isTestCase = (entity: ReportedEntity): entity is TestCase => entity.type === 'test';

const isTestSuite = (entity: ReportedEntity): entity is TestSuite => entity.type === 'suite';

const isTestModule = (entity: ReportedEntity): entity is TestModule => entity.type === 'module';

export interface TestItem {
  id: string;
  finishSend?: boolean;
  // TODO: extract from task metadata
  status?: STATUSES;
  attributes?: Attribute[];
  description?: string;
  testCaseId?: string;
}

export class RPReporter implements Reporter {
  config: ReportPortalConfig;

  client: RPClient;

  launchId: string;

  promises: Promise<void>[];

  testItems: Map<string, TestItem>;

  rootDir: string;

  constructor(config: ReportPortalConfig) {
    this.config = {
      extendTestDescriptionWithLastError: true,
      ...config,
      launchId: process.env.RP_LAUNCH_ID || config.launchId,
    };
    this.promises = [];
    this.testItems = new Map();

    const agentInfo = getAgentInfo();

    this.client = new RPClient(this.config, agentInfo);
  }

  addRequestToPromisesQueue(promise: Promise<void>, failMessage: string): void {
    this.promises.push(promiseErrorHandler(promise, failMessage));
  }

  // Start launch
  onInit(vitestInstance: Vitest): void {
    this.rootDir = vitestInstance.config.root;

    const { launch, description, attributes, skippedIssue, rerun, rerunOf, mode, launchId } =
      this.config;
    const systemAttributes: Attribute[] = getSystemAttributes(skippedIssue);

    const startLaunchObj: StartLaunchObjType = {
      name: launch,
      startTime: clientHelpers.now(),
      description,
      attributes:
        attributes && attributes.length ? attributes.concat(systemAttributes) : systemAttributes,
      rerun,
      rerunOf,
      mode: mode || LAUNCH_MODES.DEFAULT,
      id: launchId,
    };
    const { tempId, promise } = this.client.startLaunch(startLaunchObj);
    this.addRequestToPromisesQueue(promise, 'Failed to start launch.');
    this.launchId = tempId;
  }

  // Start suites, tests
  onTestModuleCollected(testModule: TestModule) {
    const basePath = this.getModuleBasePath(testModule);
    this.startReportedEntity(testModule, basePath);
  }

  onTestSuiteResult(testSuite: TestSuite) {
    this.finishReportedEntity(testSuite);
  }

  onTestCaseResult(testCase: TestCase) {
    this.finishReportedEntity(testCase);
  }

  onTestModuleEnd(testModule: TestModule) {
    this.finishReportedEntity(testModule);
  }

  startReportedEntity(entity: ReportedEntity, basePath: string, parentId?: string) {
    if (this.testItems.has(entity.id)) {
      return;
    }
    const name = this.getEntityName(entity);

    const startTime = clientHelpers.now();
    const hasDescendants = !isTestCase(entity);
    const codeRef = getCodeRef(basePath, parentId ? name : '');

    const startTestItemObj: StartTestObjType = {
      name: name,
      startTime,
      type: hasDescendants ? TEST_ITEM_TYPES.SUITE : TEST_ITEM_TYPES.STEP,
      codeRef,
    };
    const testItemObj = this.client.startTestItem(startTestItemObj, this.launchId, parentId);
    this.addRequestToPromisesQueue(testItemObj.promise, 'Failed to start test item.');
    const tempId = testItemObj.tempId;
    const mode = isTestCase(entity) || isTestSuite(entity) ? entity.options?.mode : undefined;

    if (mode === TASK_MODE.skip || mode === TASK_MODE.todo) {
      const finishTestItemObj: FinishTestItemObjType = {
        endTime: startTime,
        status: STATUSES.SKIPPED,
        attributes: mode === TASK_MODE.todo ? [{ value: TASK_MODE.todo }] : [],
      };
      const { promise } = this.client.finishTestItem(tempId, finishTestItemObj);
      this.addRequestToPromisesQueue(promise, 'Failed to finish test item.');

      return;
    }

    this.testItems.set(entity.id, {
      id: tempId,
    });

    if (hasDescendants) {
      for (const child of entity.children) {
        this.startReportedEntity(child, codeRef, tempId);
      }
    }
  }

  finishReportedEntity(entity: ReportedEntity) {
    const testItem = this.testItems.get(entity.id);
    const { id: testItemId, finishSend } = testItem || {};
    if (!testItemId || finishSend) {
      return;
    }

    const finishTestItemObj = this.getFinishTestItemObj(entity);

    if (isTestCase(entity)) {
      this.applyReportingApiMeta(entity, finishTestItemObj, testItemId);
      this.reportErrors(entity.result()?.errors, finishTestItemObj, testItemId);
    } else {
      this.reportErrors(entity.errors?.(), finishTestItemObj, testItemId);
    }

    const { promise } = this.client.finishTestItem(testItemId, finishTestItemObj);
    this.addRequestToPromisesQueue(promise, 'Failed to finish test item.');
    this.testItems.set(entity.id, {
      ...testItem,
      finishSend: true,
    });
  }

  getModuleBasePath(testModule: TestModule): string {
    const rootDir = this.rootDir || '';
    return getBasePath(testModule.moduleId, rootDir);
  }

  getEntityName(entity: ReportedEntity): string {
    if (isTestModule(entity)) {
      return entity.relativeModuleId || entity.moduleId;
    }

    return entity.name;
  }

  getFinishTestItemObj(entity: ReportedEntity): FinishTestItemObjType {
    const finishTestItemObj: FinishTestItemObjType = {
      status: STATUSES.FAILED,
      endTime: clientHelpers.now(),
    };

    if (isTestCase(entity)) {
      const result = entity.result();
      finishTestItemObj.status = this.mapStateToStatus(result?.state);
      const diagnostic = entity.diagnostic?.();
      if (
        diagnostic &&
        Number.isFinite(diagnostic.startTime) &&
        Number.isFinite(diagnostic.duration)
      ) {
        // Ensure endTime stays in whole milliseconds.
        finishTestItemObj.endTime = diagnostic.startTime + Math.round(diagnostic.duration);
      }
      if (entity.options?.mode === TASK_MODE.todo) {
        finishTestItemObj.attributes = [{ value: TASK_MODE.todo }];
      }

      return finishTestItemObj;
    }

    const state = entity.state ? entity.state() : undefined;
    finishTestItemObj.status = this.mapStateToStatus(state);

    return finishTestItemObj;
  }

  mapStateToStatus(state?: string): STATUSES {
    switch (state) {
      case TASK_STATUS.passed:
        return STATUSES.PASSED;
      case TASK_STATUS.failed:
        return STATUSES.FAILED;
      case TASK_STATUS.skipped:
      case TASK_STATUS.pending:
      case TASK_STATUS.queued:
        return STATUSES.SKIPPED;
      default:
        return STATUSES.FAILED;
    }
  }

  applyReportingApiMeta(
    testCase: TestCase,
    finishTestItemObj: FinishTestItemObjType,
    testItemId: string,
  ) {
    const meta = testCase.meta?.();
    if (!meta || !isRPTaskMeta(meta)) {
      return;
    }

    const { logs, attributes, testCaseId, description } = meta.rpMeta.test;
    logs?.forEach((logRq) => {
      this.sendLog(testItemId, logRq);
    });

    if (typeof testCaseId === 'string') {
      finishTestItemObj.testCaseId = testCaseId;
    }

    if (Array.isArray(attributes)) {
      finishTestItemObj.attributes = attributes;
    }

    if (description) {
      finishTestItemObj.description = description;
    }
  }

  reportErrors(
    errors: ReadonlyArray<{ message?: string; stack?: string; diff?: string }> | undefined,
    finishTestItemObj: FinishTestItemObjType,
    testItemId: string,
  ) {
    if (!errors?.length) {
      return;
    }

    const [firstError] = errors;

    if (this.config.extendTestDescriptionWithLastError && firstError?.message) {
      finishTestItemObj.description = (finishTestItemObj.description || '').concat(
        `\n\`\`\`error\n${firstError.message}\n\`\`\``,
      );
    }

    const logMessage = firstError.stack || firstError.message || 'Unknown error';
    const logRq: LogRQ = {
      time: finishTestItemObj.endTime,
      level: PREDEFINED_LOG_LEVELS.ERROR,
      message: logMessage,
    };
    this.sendLog(testItemId, logRq);

    if ('diff' in firstError && firstError.diff) {
      const logRqDiff: LogRQ = {
        time: finishTestItemObj.endTime,
        level: PREDEFINED_LOG_LEVELS.ERROR,
        message: `\`\`\`diff\n${firstError.diff}\n\`\`\``,
      };
      this.sendLog(testItemId, logRqDiff);
    }
  }

  sendLog(testItemId: string, logRq: LogRQ): void {
    const { file, ...logRqWithoutFile } = logRq;
    const { promise } = this.client.sendLog(
      testItemId,
      {
        level: PREDEFINED_LOG_LEVELS.INFO,
        time: clientHelpers.now(),
        ...logRqWithoutFile,
      },
      file,
    );
    this.addRequestToPromisesQueue(promise, 'Failed to send log.');
  }

  // Send test item/launch log
  onUserConsoleLog({ content, taskId, time, type }: UserConsoleLog) {
    if (!content) {
      return;
    }

    const testItemId = this.testItems.get(taskId)?.id;
    let level = PREDEFINED_LOG_LEVELS.INFO;

    if (type === 'stderr') {
      level = isErrorLog(content) ? PREDEFINED_LOG_LEVELS.ERROR : PREDEFINED_LOG_LEVELS.WARN;
    }

    const logRq: LogRQ = {
      time: time,
      level,
      message: content,
    };
    // Send log to launch in case of target test item id doesn't exist
    this.sendLog(testItemId || this.launchId, logRq);
  }

  // Finish launch
  async onTestRunEnd() {
    if (!this.config.launchId) {
      const { promise } = this.client.finishLaunch(this.launchId, {
        endTime: clientHelpers.now(),
      });
      this.addRequestToPromisesQueue(promise, 'Failed to finish launch.');
    }
    await Promise.all(this.promises);
    this.launchId = null;
    this.testItems.clear();
  }

  // onTestRemoved(trigger?: string) {
  // }

  // onWatcherStart(files?: File[], errors?: unknown[]) {
  // }
  //
  // onWatcherRerun(files: string[], trigger?: string) {
  // }
  //
  // onServerRestart(reason?: string) {
  // }

  // TODO: Interrupt the launch?
  // onProcessTimeout() {
  // }
}
