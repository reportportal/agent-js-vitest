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

import { normalize, sep } from 'node:path';
import * as vitest from 'vitest';
// @ts-ignore
import {
  name as pjsonName,
  version as pjsonVersion,
  devDependencies as pjsonDevDeps,
} from '../package.json';
import { Attribute, RPTaskMeta } from './models';

const declaredVersion = ((pjsonDevDeps || {}).vitest || '').replace(/^\D+/, '');
const getFrameworkVersion = (): string | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    return require('vitest/package.json').version || declaredVersion || undefined;
  } catch {
    return declaredVersion || undefined;
  }
};
const framework_version = getFrameworkVersion();

export const getAgentInfo = (): { version: string; name: string; framework_version?: string } => ({
  version: pjsonVersion,
  name: pjsonName,
  framework_version,
});

export const getSystemAttribute = (): Attribute => {
  return {
    key: 'agent',
    value: `${pjsonName}|${pjsonVersion}`,
    system: true,
  };
};

export const promiseErrorHandler = (promise: Promise<void>, message = ''): Promise<void> =>
  promise.catch((err) => {
    console.error(message, err);
  });

export const getBasePath = (filePath: string, rootDir: string) =>
  filePath.replace(rootDir, '').replace(new RegExp('\\'.concat(sep), 'g'), '/');

export const getCodeRef = (basePath: string, itemTitle: string): string =>
  normalize([basePath, itemTitle].join('/'));

export const isErrorLog = (message: string): boolean => {
  return message.toLowerCase().includes('error');
};

export const isRPTaskMeta = (meta: vitest.TaskMeta | RPTaskMeta): meta is RPTaskMeta =>
  'rpMeta' in meta;
