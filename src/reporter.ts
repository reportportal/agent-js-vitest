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
import { File, Reporter, Task, TaskResultPack, UserConsoleLog, TaskResult } from 'vitest';
import {
  Attribute,
  FinishTestItemObjType,
  ReportPortalConfig,
  StartLaunchObjType,
  StartTestObjType,
  LogRQ,
} from './models';
import { getAgentInfo, getSystemAttributes, promiseErrorHandler } from './utils';
import { LAUNCH_MODES, STATUSES, TEST_ITEM_TYPES, LOG_LEVELS } from './constants';

export interface TestItem {
  id: string;
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

  constructor(config: ReportPortalConfig) {
    this.config = {
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
  onInit(): void {
    const { launch, description, attributes, skippedIssue, rerun, rerunOf, mode, launchId } =
      this.config;
    const systemAttributes: Attribute[] = getSystemAttributes(skippedIssue);

    const startLaunchObj: StartLaunchObjType = {
      name: launch,
      startTime: this.client.helpers.now(),
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
  onCollected(files: File[] = []) {
    for (const file of files) {
      this.startDescendants(file);
    }
  }

  startDescendants(descendant: Task, parentId?: string) {
    const startTime = this.client.helpers.now();
    const isSuite = descendant.type === 'suite';
    // TODO: add codeRef
    const startTestItemObj: StartTestObjType = {
      name: descendant.name,
      startTime,
      type: isSuite ? TEST_ITEM_TYPES.SUITE : TEST_ITEM_TYPES.STEP,
    };
    const testItemObj = this.client.startTestItem(startTestItemObj, this.launchId, parentId);
    this.addRequestToPromisesQueue(testItemObj.promise, 'Failed to start test item.');
    const tempId = testItemObj.tempId;

    // Finish statically skipped test immediately as its result won't be derived to _onTaskUpdate_
    if (descendant.mode === 'skip') {
      const finishTestItemObj: FinishTestItemObjType = {
        endTime: startTime,
        status: STATUSES.SKIPPED,
      };
      const { promise } = this.client.finishTestItem(tempId, finishTestItemObj);
      this.addRequestToPromisesQueue(promise, 'Failed to finish test item.');

      return;
    }

    this.testItems.set(descendant.id, {
      id: tempId,
    });

    if (isSuite) {
      for (const innerDescendant of descendant.tasks) {
        this.startDescendants(innerDescendant, tempId);
      }
    }
  }

  // TODO: check with bail
  // TODO: start and finish retries synthetically?
  // https://github.com/vitest-dev/vitest/discussions/4729
  // Finish suites, tests
  onTaskUpdate(packs: TaskResultPack[]) {
    // Reverse the result packs to finish descendants first
    const packsReversed = [...packs];
    packsReversed.reverse();

    for (const [id, taskResult] of packsReversed) {
      const testItemId = this.testItems.get(id)?.id;
      if (!testItemId) {
        continue;
      }

      const finishTestItemObj = this.getFinishTestItemObj(taskResult);

      if (taskResult.errors?.length) {
        const error = taskResult.errors[0];
        const logRq: LogRQ = {
          time: finishTestItemObj.endTime,
          level: LOG_LEVELS.ERROR,
          message: error.stack,
        };
        this.sendLog(testItemId, logRq);
      }

      const { promise } = this.client.finishTestItem(testItemId, finishTestItemObj);
      this.addRequestToPromisesQueue(promise, 'Failed to finish test item.');
      this.testItems.delete(id);
    }
  }

  getFinishTestItemObj(taskResult: TaskResult): FinishTestItemObjType {
    const finishTestItemObj: FinishTestItemObjType = {
      status: STATUSES.PASSED,
    };

    switch (taskResult.state) {
      case 'pass':
      case 'fail':
        finishTestItemObj.status = taskResult.state === 'fail' ? STATUSES.FAILED : STATUSES.PASSED;
        finishTestItemObj.endTime = taskResult.startTime + taskResult.duration;
        break;
      case 'skip':
        finishTestItemObj.status = STATUSES.SKIPPED;
        break;
      default:
        break;
    }

    return finishTestItemObj;
  }

  sendLog(testItemId: string, logRq: LogRQ): void {
    const { file, ...logRqWithoutFile } = logRq;
    const { promise } = this.client.sendLog(
      testItemId,
      {
        level: LOG_LEVELS.INFO,
        time: this.client.helpers.now(),
        ...logRqWithoutFile,
      },
      file,
    );
    this.addRequestToPromisesQueue(promise, 'Failed to send log.');
  }

  // Send log, need to define the correct log parent
  onUserConsoleLog(log: UserConsoleLog) {}

  // Finish launch
  async onFinished() {
    if (!this.config.launchId) {
      const { promise } = this.client.finishLaunch(this.launchId, {
        endTime: this.client.helpers.now(),
      });
      this.addRequestToPromisesQueue(promise, 'Failed to finish launch.');
    }
    await Promise.all(this.promises);
    this.launchId = null;
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
