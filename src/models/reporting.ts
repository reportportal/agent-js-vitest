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
// eslint-disable-next-line import/named
import { RunnerTask, TaskMeta } from 'vitest';
import type {
  StartLaunchOptions,
  StartTestItemOptions,
  FinishTestItemOptions,
  LogOptions,
  Attachment,
  Attribute,
} from '@reportportal/client-javascript/models';
import { LOG_LEVELS } from '../constants';

// Aliases to the client-javascript request/model types under the agent's historical names.
export type StartLaunchObjType = StartLaunchOptions;
export type StartTestObjType = StartTestItemOptions;
export type FinishTestItemObjType = FinishTestItemOptions;
export type LogRQ = LogOptions;
export { Attachment };

export interface RPTaskMeta extends TaskMeta {
  rpMeta: {
    test: {
      logs: LogRQ[];
      attributes: Attribute[];
      testCaseId?: string;
      description?: string;
    };
  };
}

export interface ReportingApi {
  attachment: (context: RunnerTask, data: Attachment, description?: string) => void;
  attributes: (context: RunnerTask, data: Attribute[]) => void;
  testCaseId: (context: RunnerTask, data: string) => void;
  description: (context: RunnerTask, data: string) => void;
  log: (context: RunnerTask, message: string, level?: LOG_LEVELS) => void;
}

export interface GlobalReportingApi {
  attachment: (data: Attachment, description?: string) => void;
  attributes: (data: Attribute[]) => void;
  testCaseId: (data: string) => void;
  description: (data: string) => void;
  log: (message: string, level?: LOG_LEVELS) => void;
}
