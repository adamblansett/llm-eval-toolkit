import type { AssertionResult } from '../evaluators/types.js';

export type CaseStatus = 'PASSED' | 'FAILED' | 'ERROR' | 'SKIPPED';
export type ReportStatus = 'PASSED' | 'FAILED' | 'ERROR';

export interface CaseResult {
  caseId: string;
  description?: string;
  status: CaseStatus;
  assertions: AssertionResult[];
  passedAssertions: number;
  failedAssertions: number;
  errorAssertions: number;
  durationMs: number;
  failureMessages: string[];
  missingOutput?: boolean;
}

export interface AssertionTotals {
  total: number;
  passed: number;
  failed: number;
  errors: number;
}

export interface EvaluationReport {
  datasetName: string;
  datasetVersion: number;
  timestamp: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  errorCases: number;
  skippedCases: number;
  passRate: number;
  assertionTotals: AssertionTotals;
  durationMs: number;
  status: ReportStatus;
  cases: CaseResult[];
}
