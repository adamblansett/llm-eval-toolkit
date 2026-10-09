// Configuration & Exit Codes
export { ExitCode } from './config/exit-codes.js';
export {
  DEFAULT_MAX_FILE_SIZE_BYTES,
  SUPPORTED_DATASET_VERSION,
  SUPPORTED_BASELINE_VERSION,
  SUPPORTED_OUTPUT_VERSION,
} from './config/constants.js';

// Datasets
export {
  validateDataset,
  DatasetValidationError,
  BUILTIN_ASSERTION_TYPES,
  type ValidateDatasetOptions,
} from './datasets/validator.js';
export {
  loadDataset,
  loadOutputs,
  normalizeOutputs,
  OutputFixtureError,
  type LoadOptions,
} from './datasets/loader.js';
export type {
  EvaluationDataset,
  EvaluationCase,
  AssertionConfig,
  OutputMap,
  OutputFixtureFile,
  ExactMatchAssertionConfig,
  RequiredContentAssertionConfig,
  ProhibitedContentAssertionConfig,
  JsonValidAssertionConfig,
  JsonSchemaAssertionConfig,
  RequiredFieldsAssertionConfig,
  FieldTypesAssertionConfig,
  SupportedFieldType,
  BuiltinAssertionType,
} from './datasets/types.js';

// Evaluators
export { EvaluatorRegistry, defaultEvaluatorRegistry } from './evaluators/registry.js';
export { ExactMatchEvaluator } from './evaluators/exact-match.js';
export { RequiredContentEvaluator } from './evaluators/required-content.js';
export { ProhibitedContentEvaluator } from './evaluators/prohibited-content.js';
export { JsonValidEvaluator } from './evaluators/json-valid.js';
export { JsonSchemaEvaluator } from './evaluators/json-schema.js';
export { RequiredFieldsEvaluator } from './evaluators/required-fields.js';
export {
  FieldTypesEvaluator,
  matchesExpectedType,
  getActualType,
} from './evaluators/field-types.js';
export type {
  Evaluator,
  EvaluationContext,
  AssertionResult,
  AssertionStatus,
} from './evaluators/types.js';

// Runner
export { runEvaluation, type RunEvaluationOptions } from './runner/runner.js';
export type {
  CaseResult,
  CaseStatus,
  ReportStatus,
  AssertionTotals,
  EvaluationReport,
} from './runner/types.js';

// Regression
export {
  createBaselineFromReport,
  saveBaseline,
  loadBaseline,
  validateBaseline,
  BaselineFormatError,
} from './regression/storage.js';
export {
  compareEvaluationWithBaseline,
  IncompatibleBaselineError,
  SUPPORTED_REGRESSION_POLICIES,
} from './regression/comparator.js';
export type {
  BaselineData,
  BaselineCaseRecord,
  RegressionPolicy,
  RegressionComparisonResult,
} from './regression/types.js';

// Reporters
export { TerminalReporter } from './reporters/terminal.js';
export { JsonReporter, type JsonReportPayload } from './reporters/json.js';
export type { Reporter, TerminalReporterOptions, JsonReporterOptions } from './reporters/types.js';

// Utilities
export { safePreview } from './utils/sanitizer.js';
export { deepEqual } from './utils/equality.js';
export { getValueByPath, tokenizePath } from './utils/property-path.js';
export {
  readFileSafely,
  readJsonSafely,
  writeFileAtomic,
  FileReadError,
  FileNotFoundError,
  FileSizeLimitError,
  InvalidJsonFileError,
} from './utils/fs.js';
export { resolveSafePath, assertPathWithinRoot, PathSecurityError } from './utils/path.js';
