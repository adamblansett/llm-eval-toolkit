import { describe, it, expect } from 'vitest';
import {
  runEvaluation,
  validateDataset,
  normalizeOutputs,
  createBaselineFromReport,
  compareEvaluationWithBaseline,
  EvaluatorRegistry,
  TerminalReporter,
  JsonReporter,
  type EvaluationDataset,
} from '../../src/index.js';

describe('Evaluation Flow Integration', () => {
  it('runs complete lifecycle: dataset validation -> execution -> baseline -> regression comparison', async () => {
    const rawDataset = {
      version: 1,
      name: 'lifecycle-test',
      cases: [
        {
          id: 'case-01',
          description: 'Valid customer email response',
          input: 'Generate support response',
          expected: {
            status: 'resolved',
            category: 'billing',
          },
          assertions: [
            { type: 'json' },
            { type: 'exact_match' },
            {
              type: 'required_fields',
              fields: ['status', 'category'],
            },
            {
              type: 'field_types',
              types: {
                status: 'string',
                category: 'string',
              },
            },
          ],
        },
      ],
    };

    // 1. Validate dataset
    const dataset = validateDataset(rawDataset);
    expect(dataset.name).toBe('lifecycle-test');

    // 2. Normalize outputs
    const outputs = normalizeOutputs({
      'case-01': {
        status: 'resolved',
        category: 'billing',
      },
    });

    // 3. Execute evaluation
    const report = await runEvaluation(dataset, outputs);
    expect(report.status).toBe('PASSED');
    expect(report.passedCases).toBe(1);
    expect(report.assertionTotals.passed).toBe(4);

    // 4. Create baseline
    const baseline = createBaselineFromReport(report);
    expect(baseline.datasetName).toBe('lifecycle-test');
    expect(baseline.cases['case-01']?.status).toBe('PASSED');

    // 5. Compare with baseline (same report -> no regression)
    const comparisonNoRegression = compareEvaluationWithBaseline(report, baseline);
    expect(comparisonNoRegression.isRegression).toBe(false);
    expect(comparisonNoRegression.newlyFailingCases).toHaveLength(0);

    // 6. Test regression with degraded output
    const degradedOutputs = normalizeOutputs({
      'case-01': {
        status: 'pending',
        category: 'billing',
      },
    });

    const degradedReport = await runEvaluation(dataset, degradedOutputs);
    expect(degradedReport.status).toBe('FAILED');

    const comparisonWithRegression = compareEvaluationWithBaseline(degradedReport, baseline);
    expect(comparisonWithRegression.isRegression).toBe(true);
    expect(comparisonWithRegression.newlyFailingCases).toEqual(['case-01']);

    // 7. Verify reporting formats
    const termReporter = new TerminalReporter({ colors: false });
    const termOutput = termReporter.format(degradedReport, comparisonWithRegression);
    expect(termOutput).toContain('Result: REGRESSION DETECTED');

    const jsonReporter = new JsonReporter();
    const jsonOutput = jsonReporter.format(degradedReport, comparisonWithRegression);
    const parsedJson = JSON.parse(jsonOutput);
    expect(parsedJson.regression.isRegression).toBe(true);
  });

  it('supports custom evaluator in programmatic execution flow', async () => {
    const dataset: EvaluationDataset = {
      version: 1,
      name: 'custom-eval-flow',
      cases: [
        {
          id: 'custom-case',
          input: 'input text',
          assertions: [
            {
              type: 'starts_with',
              prefix: 'HTTP/2',
            },
          ],
        },
      ],
    };

    const registry = new EvaluatorRegistry();
    registry.register({
      type: 'starts_with',
      evaluate(ctx) {
        const prefix = (ctx.config as { prefix: string }).prefix;
        const actual = String(ctx.actualOutput);
        const passed = actual.startsWith(prefix);
        return {
          assertionType: 'starts_with',
          status: passed ? 'PASSED' : 'FAILED',
          message: passed
            ? `Output starts with "${prefix}"`
            : `Output does not start with "${prefix}"`,
        };
      },
    });

    const reportPass = await runEvaluation(
      dataset,
      { 'custom-case': 'HTTP/2 200 OK' },
      { registry },
    );
    expect(reportPass.status).toBe('PASSED');

    const reportFail = await runEvaluation(
      dataset,
      { 'custom-case': 'HTTP/1.1 200 OK' },
      { registry },
    );
    expect(reportFail.status).toBe('FAILED');
  });
});
