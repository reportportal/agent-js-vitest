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
import type {
  RunnerTestFile,
  RunnerTask,
  RunnerTaskResult,
  RunnerTaskResultPack,
  UserConsoleLog,
} from 'vitest';
import type { Vitest } from 'vitest/node';
import type { Reporter } from 'vitest/reporters';
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
  LOG_LEVELS,
  STATUSES,
  TEST_ITEM_TYPES,
  TASK_MODE,
  TASK_STATUS,
  FINISHED_STATES,
} from './constants';

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
  onCollected(files: RunnerTestFile[] = []) {
    for (const file of files) {
      const basePath = getBasePath(file.filepath, this.rootDir);
      this.startDescendants(file, basePath);
    }
  }

  startDescendants(descendant: RunnerTask, basePath: string, parentId?: string) {
    const { name, id, type, mode } = descendant;
    const startTime = clientHelpers.now();
    const isSuite = type === 'suite';
    const codeRef = getCodeRef(basePath, parentId ? name : '');

    const startTestItemObj: StartTestObjType = {
      name: name,
      startTime,
      type: isSuite ? TEST_ITEM_TYPES.SUITE : TEST_ITEM_TYPES.STEP,
      codeRef,
    };
    const testItemObj = this.client.startTestItem(startTestItemObj, this.launchId, parentId);
    this.addRequestToPromisesQueue(testItemObj.promise, 'Failed to start test item.');
    const tempId = testItemObj.tempId;

    // Finish statically skipped test immediately as its result won't be derived to _onTaskUpdate_
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

    this.testItems.set(id, {
      id: tempId,
    });

    if (isSuite) {
      for (const innerDescendant of descendant.tasks) {
        this.startDescendants(innerDescendant, codeRef, tempId);
      }
    }
  }

  // TODO: check with bail
  // TODO: start and finish retries synthetically?
  // https://github.com/vitest-dev/vitest/discussions/4729
  // Finish suites, tests
  onTaskUpdate(packs: RunnerTaskResultPack[]) {
    // Reverse the result packs to finish descendants first
    const packsReversed = [...packs];
    packsReversed.reverse();

    for (const [id, taskResult, meta] of packsReversed) {
      const testItem = this.testItems.get(id);
      const { id: testItemId, finishSend } = testItem || {};
      if (!testItemId || finishSend || !FINISHED_STATES.includes(taskResult?.state)) {
        continue;
      }

      const finishTestItemObj = this.getFinishTestItemObj(taskResult);

      if (isRPTaskMeta(meta)) {
        const { logs, attributes, testCaseId, description } = meta.rpMeta.test;
        logs.forEach((logRq) => {
          this.sendLog(testItemId, logRq);
        });
        Object.assign(finishTestItemObj, { attributes, testCaseId, description });
      }

      if (taskResult?.errors?.length) {
        const error = taskResult.errors[0];

        if (this.config.extendTestDescriptionWithLastError) {
          finishTestItemObj.description = (finishTestItemObj.description || '').concat(
            `\n\`\`\`error\n${error.stack}\n\`\`\``,
          );
        }

        const logRq: LogRQ = {
          time: finishTestItemObj.endTime,
          level: LOG_LEVELS.ERROR,
          message: error.stack,
        };
        this.sendLog(testItemId, logRq);
      }

      const { promise } = this.client.finishTestItem(testItemId, finishTestItemObj);
      this.addRequestToPromisesQueue(promise, 'Failed to finish test item.');
      this.testItems.set(id, {
        ...testItem,
        finishSend: true,
      });
    }
  }

  getFinishTestItemObj(taskResult?: RunnerTaskResult): FinishTestItemObjType {
    const finishTestItemObj: FinishTestItemObjType = {
      status: STATUSES.FAILED,
      endTime: clientHelpers.now(),
    };

    if (taskResult) {
      const { state, startTime, duration } = taskResult;

      switch (state) {
        case TASK_STATUS.pass:
        case TASK_STATUS.fail:
          finishTestItemObj.status = state === TASK_STATUS.fail ? STATUSES.FAILED : STATUSES.PASSED;
          if (Number.isFinite(startTime) && Number.isFinite(duration)) {
            // Ensure endTime stays in whole milliseconds.
            finishTestItemObj.endTime = startTime + Math.round(duration);
          }
          break;
        case TASK_MODE.skip:
          finishTestItemObj.status = STATUSES.SKIPPED;
          break;
        default:
          break;
      }
    }

    return finishTestItemObj;
  }

  sendLog(testItemId: string, logRq: LogRQ): void {
    const { file, ...logRqWithoutFile } = logRq;
    const { promise } = this.client.sendLog(
      testItemId,
      {
        level: LOG_LEVELS.INFO,
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
    let level = LOG_LEVELS.INFO;

    if (type === 'stderr') {
      level = isErrorLog(content) ? LOG_LEVELS.ERROR : LOG_LEVELS.WARN;
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
  async onFinished() {
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
