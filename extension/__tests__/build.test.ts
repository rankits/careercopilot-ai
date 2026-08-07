import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Extension Build Process', () => {
  it('should have a manifest.json file', () => {
    const manifestPath = path.resolve(__dirname, '../manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('Career Copilot');
  });
});
