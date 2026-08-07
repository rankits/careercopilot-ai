import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Manifest Permissions Validation', () => {
  const manifestPath = path.resolve(__dirname, '../manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  it('does not request broad <all_urls> or wildcard host permissions', () => {
    const checkPermissions = (perms: string[] = []) => {
      perms.forEach(perm => {
        // Ensure no broad wildcards that grant access everywhere
        expect(perm).not.toMatch(/<all_urls>/);
        expect(perm).not.toBe('*://*/*');
        expect(perm).not.toBe('http://*/*');
        expect(perm).not.toBe('https://*/*');
      });
    };

    checkPermissions(manifest.permissions);
    checkPermissions(manifest.host_permissions);
    checkPermissions(manifest.optional_host_permissions);
  });

  it('only requests explicitly allowed ATS domains in host_permissions', () => {
    // Current explicitly allowed ATS domains per AA-104 and AA-101
    const allowedDomains = [
      '*://*.ashbyhq.com/*'
    ];

    const hostPerms = manifest.host_permissions || [];
    
    // Check that every requested host permission is in the allowlist
    hostPerms.forEach((perm: string) => {
      expect(allowedDomains).toContain(perm);
    });

    // We shouldn't request any generic permissions in `permissions` array 
    // that look like hosts.
    const perms = manifest.permissions || [];
    perms.forEach((perm: string) => {
      expect(perm).not.toMatch(/:\/\//); // URLs shouldn't be in the general permissions array
    });
  });
  
  it('includes a privacy policy or homepage link', () => {
    expect(manifest.homepage_url).toBe('https://careercopilot.com/privacy');
  });
});
