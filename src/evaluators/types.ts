export type AssertionStatus = 'PASSED' | 'FAILED' | 'ERROR';

export interface AssertionResult {
  assertionType: string;
  status: AssertionStatus;
  message: string;
  expected?: unknown;
  actual?: unknown;
  diagnostics?: Record<string, unknown>;
  durationMs?: number;
}

export interface EvaluationContext<TConfig = unknown> {
  caseId: string;
  input: unknown;
  expected?: unknown;
  actualOutput: unknown;
  config: TConfig;
}

export interface Evaluator<TConfig = unknown> {
  readonly type: string;
  evaluate(context: EvaluationContext<TConfig>): Promise<AssertionResult> | AssertionResult;
}
