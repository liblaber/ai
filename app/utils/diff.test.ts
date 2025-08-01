// Mock the constants to avoid complex dependencies
jest.mock('./constants', () => ({
  WORK_DIR: '/home/project',
}));

import { extractRelativePath } from './diff';

describe('Diff', () => {
  it('should strip out Work_dir', () => {
    const filePath = '/home/project/index.js';
    const result = extractRelativePath(filePath);
    expect(result).toBe('index.js');
  });
});
