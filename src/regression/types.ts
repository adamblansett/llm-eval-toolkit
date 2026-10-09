import type { CaseStatus } from '../runner/types.js';

export interface BaselineCaseRecord {
  status: CaseStatus;
  passedAssertions: number;
  failedAssertions: number;
  errorAssertions: number;
  assertionTypes?: string[];
}

export interface BaselineData {
  baselineVersion: number;
  createdAt: string;
  datasetName: string;
  datasetVersion: number;
  metadata?: Record<string, unknown>;
  cases: Record<string, BaselineCaseRecord>;
}

export type RegressionPolicy = 'fail-on-regression' | 'fail-on-any-failure' | 'strict';

export interface RegressionComparisonResult {
  datasetName: string;
  baselineCreatedAt: string;
  totalCasesCurrent: number;
  totalCasesBaseline: number;
  newlyFailingCases: string[];
  recoveredCases: string[];
  remainedPassingCases: string[];
  remainedFailingCases: string[];
  addedCases: string[];
  removedCases: string[];
  isRegression: boolean;
  policy: RegressionPolicy;
  policyViolations: string[];
}
