/**
 * Stable exit codes for the llm-eval CLI and execution pipeline.
 */
export enum ExitCode {
  /** All evaluations passed successfully and no regressions detected. */
  SUCCESS = 0,

  /** One or more evaluation assertions failed. */
  EVALUATION_FAILED = 1,

  /** Invalid command line arguments, configuration, dataset, or output fixture. */
  CONFIG_OR_DATASET_ERROR = 2,

  /** Regression comparison detected a policy violation (e.g., previously passing case now failing). */
  REGRESSION_DETECTED = 3,

  /** Unexpected runtime error, I/O error, or unhandled exception. */
  RUNTIME_ERROR = 4,
}
