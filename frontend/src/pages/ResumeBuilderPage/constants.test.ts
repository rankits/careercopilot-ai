import { describe, expect, it } from 'vitest';

import { SUPPORTED_RESUME_TYPES, WORKFLOW_STEPS } from './constants';

describe('ResumeBuilderPage constants', () => {
  describe('WORKFLOW_STEPS', () => {
    it('should have exactly 5 workflow steps', () => {
      expect(WORKFLOW_STEPS).toHaveLength(5);
    });

    it('should have correct labels in order', () => {
      const labels = WORKFLOW_STEPS.map((step) => step.label);
      expect(labels).toEqual(['Upload', 'Define Role', 'Analyze', 'Review', 'Export']);
    });

    it('should have correct descriptions', () => {
      const descriptions = WORKFLOW_STEPS.map((step) => step.description);
      expect(descriptions).toEqual([
        'Completed',
        'In progress',
        'Resume analysis',
        'Improve resume',
        'Download your resume',
      ]);
    });

    it('should have internalSteps that cover all resume builder steps 1-10', () => {
      const allInternalSteps = WORKFLOW_STEPS.flatMap((step) => step.internalSteps);
      expect(allInternalSteps.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 10]);
    });

    it('should have unique internalSteps across workflow steps', () => {
      const allInternalSteps = WORKFLOW_STEPS.flatMap((step) => step.internalSteps);
      const uniqueSteps = new Set(allInternalSteps);
      expect(uniqueSteps.size).toBe(allInternalSteps.length);
    });

    it('each workflow step should have an icon', () => {
      WORKFLOW_STEPS.forEach((step) => {
        expect(step.icon).toBeDefined();
        expect(typeof step.icon).toBe('object');
      });
    });

    it('should have correct internalSteps for each workflow step', () => {
      // TypeScript needs explicit checks for array index access
      const step1 = WORKFLOW_STEPS[0];
      const step2 = WORKFLOW_STEPS[1];
      const step3 = WORKFLOW_STEPS[2];
      const step4 = WORKFLOW_STEPS[3];
      const step5 = WORKFLOW_STEPS[4];

      expect(step1).toBeDefined();
      expect(step2).toBeDefined();
      expect(step3).toBeDefined();
      expect(step4).toBeDefined();
      expect(step5).toBeDefined();

      expect(step1!.internalSteps).toEqual([1]);
      expect(step2!.internalSteps).toEqual([2]);
      expect(step3!.internalSteps).toEqual([3]);
      expect(step4!.internalSteps).toEqual([4, 5]);
      expect(step5!.internalSteps).toEqual([10]);
    });
  });

  describe('SUPPORTED_RESUME_TYPES', () => {
    it('should have exactly 6 resume types', () => {
      expect(SUPPORTED_RESUME_TYPES).toHaveLength(6);
    });

    it('should contain all expected resume types', () => {
      expect(SUPPORTED_RESUME_TYPES).toEqual([
        'Chronological Resume',
        'Functional Resume',
        'Combination Resume',
        'Student Resume',
        'Executive Resume',
        'Cover Letter (Optional)',
      ]);
    });

    it('should not have duplicate entries', () => {
      const uniqueTypes = new Set(SUPPORTED_RESUME_TYPES);
      expect(uniqueTypes.size).toBe(SUPPORTED_RESUME_TYPES.length);
    });

    it('all entries should be non-empty strings', () => {
      SUPPORTED_RESUME_TYPES.forEach((type) => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });
});
