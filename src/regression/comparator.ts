import type { EvaluationReport } from '../runner/types.js';
import type { BaselineData, RegressionComparisonResult, RegressionPolicy } from './types.js';

export class IncompatibleBaselineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IncompatibleBaselineError';
  }
}

export const SUPPORTED_REGRESSION_POLICIES: readonly RegressionPolicy[] = [
  'fail-on-regression',
  'fail-on-any-failure',
  'strict',
];

/**
 * Compares an evaluation run report against a saved baseline.
 */
export function compareEvaluationWithBaseline(
  report: EvaluationReport,
  baseline: BaselineData,
  policy: RegressionPolicy = 'fail-on-regression',
): RegressionComparisonResult {
  if (!SUPPORTED_REGRESSION_POLICIES.includes(policy)) {
    throw new IncompatibleBaselineError(
      `Invalid regression policy: "${policy}". Expected one of: ${SUPPORTED_REGRESSION_POLICIES.join(', ')}`,
    );
  }

  if (report.datasetName !== baseline.datasetName) {
    throw new IncompatibleBaselineError(
      `Dataset name mismatch: current run evaluates "${report.datasetName}", but baseline is for "${baseline.datasetName}"`,
    );
  }

  if (report.datasetVersion !== baseline.datasetVersion) {
    throw new IncompatibleBaselineError(
      `Dataset version mismatch: current run is version ${report.datasetVersion}, but baseline is version ${baseline.datasetVersion}`,
    );
  }

  const currentCasesMap = new Map(report.cases.map((c) => [c.caseId, c]));
  const baselineCasesMap = new Map(Object.entries(baseline.cases));

  const newlyFailingCases: string[] = [];
  const recoveredCases: string[] = [];
  const remainedPassingCases: string[] = [];
  const remainedFailingCases: string[] = [];
  const addedCases: string[] = [];
  const removedCases: string[] = [];

  // Check all current cases against baseline
  for (const [caseId, currentCase] of currentCasesMap) {
    const baselineCase = baselineCasesMap.get(caseId);

    if (!baselineCase) {
      addedCases.push(caseId);
      continue;
    }

    const wasPassed = baselineCase.status === 'PASSED';
    const isNowPassed = currentCase.status === 'PASSED';

    if (wasPassed && !isNowPassed) {
      newlyFailingCases.push(caseId);
    } else if (!wasPassed && isNowPassed) {
      recoveredCases.push(caseId);
    } else if (wasPassed && isNowPassed) {
      remainedPassingCases.push(caseId);
    } else {
      remainedFailingCases.push(caseId);
    }
  }

  // Check for cases removed from baseline
  for (const caseId of baselineCasesMap.keys()) {
    if (!currentCasesMap.has(caseId)) {
      removedCases.push(caseId);
    }
  }

  const policyViolations: string[] = [];

  if (policy === 'fail-on-regression') {
    if (newlyFailingCases.length > 0) {
      policyViolations.push(
        `Detected ${newlyFailingCases.length} newly failing case(s): ${newlyFailingCases.join(', ')}`,
      );
    }
  } else if (policy === 'fail-on-any-failure') {
    if (report.failedCases > 0 || report.errorCases > 0) {
      policyViolations.push(
        `Current run contains ${report.failedCases + report.errorCases} failure(s) under "fail-on-any-failure" policy`,
      );
    }
  } else if (policy === 'strict') {
    if (newlyFailingCases.length > 0) {
      policyViolations.push(
        `Detected ${newlyFailingCases.length} newly failing case(s): ${newlyFailingCases.join(', ')}`,
      );
    }
    if (removedCases.length > 0) {
      policyViolations.push(
        `Detected ${removedCases.length} removed case(s) from baseline: ${removedCases.join(', ')}`,
      );
    }
  }

  const isRegression = policyViolations.length > 0;

  return {
    datasetName: report.datasetName,
    baselineCreatedAt: baseline.createdAt,
    totalCasesCurrent: report.cases.length,
    totalCasesBaseline: Object.keys(baseline.cases).length,
    newlyFailingCases,
    recoveredCases,
    remainedPassingCases,
    remainedFailingCases,
    addedCases,
    removedCases,
    isRegression,
    policy,
    policyViolations,
  };
}
