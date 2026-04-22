import type { TaskMeta } from 'vitest';
import {
  getAgentInfo,
  getSystemAttribute,
  promiseErrorHandler,
  getBasePath,
  getCodeRef,
  isErrorLog,
  isRPTaskMeta,
} from '../utils';
import { RPTaskMeta } from '../models';

jest.mock('../../package.json', () => ({
  name: '@reportportal/agent-js-vitest',
  version: '1.0.0',
}));

jest.mock('vitest/package.json', () => ({
  version: '3.2.4',
}));

const mockAgentInfo = {
  name: '@reportportal/agent-js-vitest',
  version: '1.0.0',
  framework_version: '3.2.4',
};

describe('utils', () => {
  describe('getAgentInfo', () => {
    it('should return agent name and version from package.json', () => {
      const agentInfo = getAgentInfo();

      expect(agentInfo).toEqual(mockAgentInfo);
    });
  });

  describe('getSystemAttribute', () => {
    it('should return system attribute with agent info', () => {
      const systemAttribute = getSystemAttribute();

      expect(systemAttribute).toEqual({
        key: 'agent',
        value: `${mockAgentInfo.name}|${mockAgentInfo.version}`,
        system: true,
      });
    });
  });

  describe('promiseErrorHandler', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should resolve successfully for resolved promise', async () => {
      const promise = Promise.resolve();

      await expect(promiseErrorHandler(promise)).resolves.toBeUndefined();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should catch and log error for rejected promise', async () => {
      const error = new Error('Test error');
      const promise = Promise.reject(error);

      await promiseErrorHandler(promise, 'Custom message');

      expect(consoleSpy).toHaveBeenCalledWith('Custom message', error);
    });

    it('should catch and log error with empty message', async () => {
      const error = new Error('Test error');
      const promise = Promise.reject(error);

      await promiseErrorHandler(promise);

      expect(consoleSpy).toHaveBeenCalledWith('', error);
    });
  });

  describe('getBasePath', () => {
    it('should remove root directory from file path', () => {
      const filePath = '/Users/test/project/src/test.ts';
      const rootDir = '/Users/test/project';

      const basePath = getBasePath(filePath, rootDir);

      expect(basePath).toBe('/src/test.ts');
    });

    it('should handle paths with Windows root directory', () => {
      const filePath = 'C:\\Users\\test\\project\\src\\test.ts';
      const rootDir = 'C:\\Users\\test\\project';

      const basePath = getBasePath(filePath, rootDir);

      expect(basePath).toContain('src');
      expect(basePath).toContain('test.ts');
    });

    it('should handle empty root directory', () => {
      const filePath = '/src/test.ts';
      const rootDir = '';

      const basePath = getBasePath(filePath, rootDir);

      expect(basePath).toBe('/src/test.ts');
    });
  });

  describe('getCodeRef', () => {
    it('should combine base path and item title', () => {
      const basePath = '/src/test.ts';
      const itemTitle = 'testSuite';

      const codeRef = getCodeRef(basePath, itemTitle);

      expect(codeRef).toContain('/src/test.ts');
      expect(codeRef).toContain('testSuite');
    });

    it('should normalize the combined path', () => {
      const basePath = '/src/test.ts';
      const itemTitle = 'testSuite/testCase';

      const codeRef = getCodeRef(basePath, itemTitle);

      expect(codeRef).toBeDefined();
    });

    it('should handle empty item title', () => {
      const basePath = '/src/test.ts';
      const itemTitle = '';

      const codeRef = getCodeRef(basePath, itemTitle);

      expect(codeRef).toContain('test.ts');
    });
  });

  describe('isErrorLog', () => {
    it('should return true for message containing "error"', () => {
      expect(isErrorLog('This is an error message')).toBe(true);
    });

    it('should return true for message containing "Error" (case insensitive)', () => {
      expect(isErrorLog('Error: Something went wrong')).toBe(true);
    });

    it('should return true for message containing "ERROR" (uppercase)', () => {
      expect(isErrorLog('ERROR: Critical failure')).toBe(true);
    });

    it('should return false for message not containing "error"', () => {
      expect(isErrorLog('This is a warning message')).toBe(false);
    });

    it('should return false for empty message', () => {
      expect(isErrorLog('')).toBe(false);
    });

    it('should return false for regular log message', () => {
      expect(isErrorLog('Test passed successfully')).toBe(false);
    });
  });

  describe('isRPTaskMeta', () => {
    it('should return true for RPTaskMeta object', () => {
      const rpTaskMeta: RPTaskMeta = {
        rpMeta: {
          test: {
            logs: [],
            attributes: [],
          },
        },
      };

      expect(isRPTaskMeta(rpTaskMeta)).toBe(true);
    });

    it('should return false for regular TaskMeta object', () => {
      const taskMeta: TaskMeta = {};

      expect(isRPTaskMeta(taskMeta)).toBe(false);
    });

    it('should return false for TaskMeta with other properties', () => {
      const taskMeta = {
        someOtherProp: 'value',
      } as TaskMeta;

      expect(isRPTaskMeta(taskMeta)).toBe(false);
    });

    it('should return true for RPTaskMeta with additional properties', () => {
      const rpTaskMeta: RPTaskMeta = {
        rpMeta: {
          test: {
            logs: [],
            attributes: [],
            description: 'test',
          },
        },
      };

      expect(isRPTaskMeta(rpTaskMeta)).toBe(true);
    });
  });
});
