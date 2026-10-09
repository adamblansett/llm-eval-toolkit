import type { EvaluationReport } from '../runner/types.js';
import type { RegressionComparisonResult } from '../regression/types.js';
import type { Reporter, JsonReporterOptions } from './types.js';

export interface JsonReportPayload {
  report: EvaluationReport;
  regression?: RegressionComparisonResult;
}

export class JsonReporter implements Reporter {
  private options: JsonReporterOptions;

  constructor(options: JsonReporterOptions = {}) {
    this.options = {
      pretty: options.pretty ?? true,
    };
  }

  public format(report: EvaluationReport, regression?: RegressionComparisonResult): string {
    const payload: JsonReportPayload = {
      report,
      ...(regression ? { regression } : {}),
    };

    return this.options.pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  }
}
