import { defaultEvaluatorRegistry, type EvaluatorRegistry } from '../evaluators/registry.js';
import type { EvaluationDataset, OutputMap } from '../datasets/types.js';
import type { AssertionResult, EvaluationContext } from '../evaluators/types.js';
import type { CaseResult, EvaluationReport, ReportStatus, AssertionTotals } from './types.js';

export interface RunEvaluationOptions {
  registry?: EvaluatorRegistry;
  caseFilter?: string[];
}

/**
 * Executes evaluation of a dataset against an output map (e.g. saved output fixtures).
 */
export async function runEvaluation(
  dataset: EvaluationDataset,
  outputs: OutputMap,
  options?: RunEvaluationOptions,
): Promise<EvaluationReport> {
  const runnerStart = performance.now();
  const registry = options?.registry ?? defaultEvaluatorRegistry;
  const filterSet = options?.caseFilter ? new Set(options.caseFilter) : null;

  const targetCases = filterSet ? dataset.cases.filter((c) => filterSet.has(c.id)) : dataset.cases;

  const caseResults: CaseResult[] = [];
  const assertionTotals: AssertionTotals = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: 0,
  };

  let passedCases = 0;
  let failedCases = 0;
  let errorCases = 0;
  const skippedCases = dataset.cases.length - targetCases.length;

  for (const testCase of targetCases) {
    const caseStart = performance.now();
    const caseId = testCase.id;

    // Check output availability
    const hasOutput = Object.prototype.hasOwnProperty.call(outputs, caseId);
    if (!hasOutput) {
      errorCases++;
      caseResults.push({
        caseId,
        description: testCase.description,
        status: 'ERROR',
        assertions: [],
        passedAssertions: 0,
        failedAssertions: 0,
        errorAssertions: 1,
        durationMs: performance.now() - caseStart,
        failureMessages: [`Output missing for case "${caseId}" in outputs fixture`],
        missingOutput: true,
      });
      assertionTotals.total++;
      assertionTotals.errors++;
      continue;
    }

    const actualOutput = outputs[caseId];
    const caseAssertionResults: AssertionResult[] = [];
    const failureMessages: string[] = [];
    let casePassedCount = 0;
    let caseFailedCount = 0;
    let caseErrorCount = 0;

    for (const assertion of testCase.assertions) {
      const assertionStart = performance.now();
      const evaluator = registry.get(assertion.type);

      if (!evaluator) {
        caseErrorCount++;
        const res: AssertionResult = {
          assertionType: assertion.type,
          status: 'ERROR',
          message: `No evaluator registered for assertion type "${assertion.type}"`,
          durationMs: performance.now() - assertionStart,
        };
        caseAssertionResults.push(res);
        failureMessages.push(`[${assertion.type}]: ${res.message}`);
        continue;
      }

      const context: EvaluationContext = {
        caseId,
        input: testCase.input,
        expected: testCase.expected,
        actualOutput,
        config: assertion,
      };

      try {
        const result = await Promise.resolve(evaluator.evaluate(context));
        caseAssertionResults.push(result);

        if (result.status === 'PASSED') {
          casePassedCount++;
        } else if (result.status === 'FAILED') {
          caseFailedCount++;
          failureMessages.push(`[${assertion.type}]: ${result.message}`);
        } else {
          caseErrorCount++;
          failureMessages.push(`[${assertion.type} ERROR]: ${result.message}`);
        }
      } catch (err: unknown) {
        caseErrorCount++;
        const error = err as Error;
        const res: AssertionResult = {
          assertionType: assertion.type,
          status: 'ERROR',
          message: `Evaluator threw an unhandled exception: ${error.message}`,
          diagnostics: {
            stack: error.stack,
          },
          durationMs: performance.now() - assertionStart,
        };
        caseAssertionResults.push(res);
        failureMessages.push(`[${assertion.type} EXCEPTION]: ${res.message}`);
      }
    }

    assertionTotals.total += caseAssertionResults.length;
    assertionTotals.passed += casePassedCount;
    assertionTotals.failed += caseFailedCount;
    assertionTotals.errors += caseErrorCount;

    let caseStatus: CaseResult['status'];
    if (caseErrorCount > 0) {
      caseStatus = 'ERROR';
      errorCases++;
    } else if (caseFailedCount > 0) {
      caseStatus = 'FAILED';
      failedCases++;
    } else {
      caseStatus = 'PASSED';
      passedCases++;
    }

    caseResults.push({
      caseId,
      description: testCase.description,
      status: caseStatus,
      assertions: caseAssertionResults,
      passedAssertions: casePassedCount,
      failedAssertions: caseFailedCount,
      errorAssertions: caseErrorCount,
      durationMs: performance.now() - caseStart,
      failureMessages,
      missingOutput: false,
    });
  }

  const totalEvaluated = passedCases + failedCases + errorCases;
  const passRate = totalEvaluated > 0 ? (passedCases / totalEvaluated) * 100 : 0;

  let reportStatus: ReportStatus = 'PASSED';
  if (errorCases > 0) {
    reportStatus = 'ERROR';
  } else if (failedCases > 0) {
    reportStatus = 'FAILED';
  }

  return {
    datasetName: dataset.name,
    datasetVersion: dataset.version,
    timestamp: new Date().toISOString(),
    totalCases: dataset.cases.length,
    passedCases,
    failedCases,
    errorCases,
    skippedCases,
    passRate: Number(passRate.toFixed(2)),
    assertionTotals,
    durationMs: performance.now() - runnerStart,
    status: reportStatus,
    cases: caseResults,
  };
}
