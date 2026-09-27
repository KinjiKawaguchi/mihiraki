import { describe, expect, it } from 'vitest';
import { fileContainerId } from './file-anchor';

describe('fileContainerId', () => {
  it('matches the id GitHub gives a file in the Files changed page', async () => {
    // Observed on github.com: the AGENTS.md diff lives in div#diff-a54ff18…
    expect(await fileContainerId('AGENTS.md')).toBe('diff-a54ff182c7e8acf56acfd6e4b9c3ff41e2c41a31c9b211b2deb9df75d9a478f9');
  });
});
