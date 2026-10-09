import type { EvaluationReport } from '../runner/types.js';
import type { RegressionComparisonResult } from '../regression/types.js';

export interface Reporter {
  format(report: EvaluationReport, regression?: RegressionComparisonResult): string;
}

export interface TerminalReporterOptions {
  colors?: boolean;
  verbose?: boolean;
}

export interface JsonReporterOptions {
  pretty?: boolean;
}
