import { describe, it, expect } from 'vitest';
import { runEvaluation } from '../../../src/runner/runner.js';
import { EvaluatorRegistry } from '../../../src/evaluators/registry.js';
import type { EvaluationDataset } from '../../../src/datasets/types.js';

describe('runEvaluation', () => {
  const dataset: EvaluationDataset = {
    version: 1,
    name: 'runner-test-dataset',
    cases: [
      {
        id: 'c-1',
        description: 'Case 1 passing',
        input: 'prompt 1',
        expected: 'hello',
        assertions: [{ type: 'exact_match' }],
      },
      {
        id: 'c-2',
        description: 'Case 2 failing',
        input: 'prompt 2',
        expected: 'world',
        assertions: [{ type: 'exact_match' }],
      },
      {
        id: 'c-3',
        description: 'Case 3 with missing output',
        input: 'prompt 3',
        assertions: [{ type: 'json' }],
      },
    ],
  };

  it('correctly executes evaluation and distinguishes failures from missing outputs', async () => {
    const outputs = {
      'c-1': 'hello', // passes
      'c-2': 'not-world', // fails assertion
      // 'c-3' omitted -> missing output
    };

    const report = await runEvaluation(dataset, outputs);

    expect(report.datasetName).toBe('runner-test-dataset');
    expect(report.totalCases).toBe(3);
    expect(report.passedCases).toBe(1);
    expect(report.failedCases).toBe(1);
    expect(report.errorCases).toBe(1); // c-3 has missing output
    expect(report.passRate).toBeCloseTo(33.33, 1);
    expect(report.status).toBe('ERROR');

    // Inspect case 1
    const c1 = report.cases.find((c) => c.caseId === 'c-1');
    expect(c1?.status).toBe('PASSED');
    expect(c1?.passedAssertions).toBe(1);

    // Inspect case 2
    const c2 = report.cases.find((c) => c.caseId === 'c-2');
    expect(c2?.status).toBe('FAILED');
    expect(c2?.failedAssertions).toBe(1);
    expect(c2?.failureMessages.length).toBe(1);

    // Inspect case 3
    const c3 = report.cases.find((c) => c.caseId === 'c-3');
    expect(c3?.status).toBe('ERROR');
    expect(c3?.missingOutput).toBe(true);
    expect(c3?.failureMessages[0]).toContain('Output missing for case "c-3"');
  });

  it('isolates evaluators that throw exceptions', async () => {
    const registry = new EvaluatorRegistry();
    registry.register({
      type: 'crashing_evaluator',
      evaluate() {
        throw new Error('Fatal explosion inside evaluator');
      },
    });

    const crashDataset: EvaluationDataset = {
      version: 1,
      name: 'crash-dataset',
      cases: [
        {
          id: 'crash-case',
          input: 'input',
          assertions: [{ type: 'crashing_evaluator' }],
        },
      ],
    };

    const report = await runEvaluation(crashDataset, { 'crash-case': 'val' }, { registry });

    expect(report.status).toBe('ERROR');
    expect(report.errorCases).toBe(1);
    const c = report.cases[0];
    expect(c?.status).toBe('ERROR');
    expect(c?.failureMessages[0]).toContain('Evaluator threw an unhandled exception');
  });

  it('filters cases when caseFilter option is passed', async () => {
    const outputs = {
      'c-1': 'hello',
      'c-2': 'world',
    };

    const report = await runEvaluation(dataset, outputs, { caseFilter: ['c-1'] });
    expect(report.totalCases).toBe(3);
    expect(report.passedCases).toBe(1);
    expect(report.skippedCases).toBe(2);
    expect(report.status).toBe('PASSED');
  });
});
