# LLM Eval Toolkit

[![CI](https://github.com/adamblansett/llm-eval-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/adamblansett/llm-eval-toolkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](package.json)

**Developer-focused, contract-based evaluation framework and regression detection for AI application outputs.**

LLM Eval Toolkit validates AI outputs against explicit contracts, detects regressions between evaluation runs, and integrates directly with CI/CD workflows. The core engine runs **100% locally and deterministically**—no API keys, no network access, no paid model subscriptions, and no external dependencies required.

---

## Table of Contents

- [Why LLM Eval Toolkit?](#why-llm-eval-toolkit)
- [Core Features](#core-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Evaluation Dataset Format](#evaluation-dataset-format)
- [Output Fixtures Format](#output-fixtures-format)
- [Built-In Evaluator Reference](#built-in-evaluator-reference)
  - [1. exact\_match](#1-exact_match)
  - [2. required\_content](#2-required_content)
  - [3. prohibited\_content](#3-prohibited_content)
  - [4. json / json\_valid](#4-json--json_valid)
  - [5. json\_schema](#5-json_schema)
  - [6. required\_fields](#6-required_fields)
  - [7. field\_types](#7-field_types)
  - [8. Custom Evaluator Interface](#8-custom-evaluator-interface)
- [CLI Reference](#cli-reference)
- [Exit Code Contract](#exit-code-contract)
- [Regression Detection & Baselines](#regression-detection--baselines)
- [Programmatic API](#programmatic-api)
- [GitHub Actions CI Integration](#github-actions-ci-integration)
- [Security & Privacy Guarantees](#security--privacy-guarantees)
- [Known Limitations](#known-limitations)
- [Development & Verification](#development--verification)
- [Contributing](#contributing)
- [Legal Disclaimer & Limitation of Liability](#legal-disclaimer--limitation-of-liability)
- [License](#license)
- [Author](#author)

---

## Why LLM Eval Toolkit?

Traditional unit tests expect predictable, deterministic behavior. When applications integrate Large Language Models (LLMs), new failure modes emerge:

- Structured outputs occasionally violate JSON syntax or JSON Schemas.
- Minor prompt tweaks or model version changes cause silent downstream regressions.
- Required keys are omitted, or values have unexpected types (e.g. strings instead of numbers).
- Outputs leak confidential tokens or prohibited phrases.
- Testing against live LLM APIs in CI pipelines is slow, flaky, costly, and leaks sensitive test data over the network.

**LLM Eval Toolkit solves this by decoupling application contract testing from live model execution.** You evaluate saved output fixtures against strict application contracts, verify compliance, and compare against saved baselines to catch regressions before code reaches production.

---

## Core Features

- **Deterministic Evaluation Engine**: Executes offline without network calls, external API dependencies, or credentials.
- **Versioned Evaluation Datasets**: Strict JSON dataset specifications validated with Zod, featuring actionable errors with exact file and case locations.
- **Rich Built-in Contract Evaluators**: Exact match, required phrases, prohibited phrases, JSON syntax, JSON Schema (via Ajv), required keys, and field types.
- **Regression Detection**: Versioned evaluation baselines track passing and failing cases over time, detecting newly failing cases and policy violations.
- **Dual Reporters**: Colorized terminal output for local development and structured JSON output for downstream tooling.
- **Stable Exit Codes**: Explicit process exit codes (0–4) designed for CI automation.
- **Custom Evaluator Extensibility**: Strongly typed API for registering custom evaluators.
- **Security-First Architecture**: Path traversal prevention, safe atomic file writes, payload sanitization to protect sensitive data, and input size boundaries.

---

## Installation

### From Source (Local Development)

Clone the repository and install dependencies using Node.js (>= 18.0.0 LTS):

```bash
git clone https://github.com/adamblansett/llm-eval-toolkit.git
cd llm-eval-toolkit
npm install
npm run build
```

To link the `llm-eval` command globally during local development:

```bash
npm link
```

Verify the installation:

```bash
llm-eval --version
# 0.1.0
```

---

## Quick Start

### 1. Create an Evaluation Dataset (`dataset.json`)

Define an evaluation dataset specifying your input and the contracts your application requires:

```json
{
  "version": 1,
  "name": "receipt-eval",
  "description": "Verify receipt parsing contracts",
  "cases": [
    {
      "id": "receipt-001",
      "input": "Receipt: Whole Foods Market, $42.50 USD, groceries",
      "expected": {
        "merchant": "Whole Foods Market",
        "amount": 42.5,
        "currency": "USD"
      },
      "assertions": [
        { "type": "json" },
        { "type": "exact_match" },
        { "type": "required_fields", "fields": ["merchant", "amount", "currency"] },
        {
          "type": "field_types",
          "types": {
            "merchant": "string",
            "amount": "number",
            "currency": "string"
          }
        }
      ]
    }
  ]
}
```

### 2. Supply an Output Fixture (`outputs.json`)

Save the actual outputs produced by your AI application:

```json
{
  "version": 1,
  "outputs": {
    "receipt-001": {
      "merchant": "Whole Foods Market",
      "amount": 42.5,
      "currency": "USD"
    }
  }
}
```

### 3. Run the Evaluation

```bash
llm-eval run dataset.json -o outputs.json
```

Output:

```text
LLM Eval Report: receipt-eval (v1)
Time: 2026-10-09T20:45:00.000Z | Duration: 4.2ms
──────────────────────────────────────────────────────
Evaluation Summary:
  Total cases:       1
  Passed cases:      1
  Failed cases:      0
  Pass rate:         100.0%

Assertions:
  Total: 4 | Passed: 4 | Failed: 0 | Errors: 0
──────────────────────────────────────────────────────
Result: PASSED
```

---

## Evaluation Dataset Format

Evaluation datasets are validated with [Zod](https://zod.dev) before execution. Malformed datasets are rejected with actionable errors pointing directly to the offending case ID and property path.

| Field         | Type               | Description                                         |
| :------------ | :----------------- | :-------------------------------------------------- |
| `version`     | `number` (integer) | **Required.** Must be `1`.                          |
| `name`        | `string`           | **Required.** Unique, non-empty dataset identifier. |
| `description` | `string`           | Optional descriptive summary.                       |
| `cases`       | `Array<Case>`      | **Required.** Non-empty list of test cases.         |
| `metadata`    | `object`           | Optional key-value metadata.                        |

### Case Schema

| Field         | Type               | Description                                             |
| :------------ | :----------------- | :------------------------------------------------------ |
| `id`          | `string`           | **Required.** Unique, non-empty case identifier.        |
| `description` | `string`           | Optional human-readable description.                    |
| `input`       | `unknown`          | **Required.** The input prompt or payload.              |
| `expected`    | `unknown`          | Optional expected baseline value used by `exact_match`. |
| `assertions`  | `Array<Assertion>` | **Required.** Non-empty list of assertion configs.      |
| `metadata`    | `object`           | Optional custom metadata.                               |

---

## Output Fixtures Format

The runner accepts model outputs mapped to case IDs. Four equivalent JSON formats are supported:

### Format A: Versioned Object (Recommended)

```json
{
  "version": 1,
  "outputs": {
    "case-001": "{\"status\":\"ok\"}",
    "case-002": { "count": 42 }
  }
}
```

### Format B: Direct Key-Value Map

```json
{
  "case-001": "{\"status\":\"ok\"}",
  "case-002": { "count": 42 }
}
```

### Format C: Array of Output Objects

```json
[
  { "id": "case-001", "output": "{\"status\":\"ok\"}" },
  { "id": "case-002", "output": { "count": 42 } }
]
```

### Missing Outputs Handling

If a case defined in the dataset does not have a corresponding entry in the output fixture:

- The case is marked with status `ERROR` and `missingOutput: true`.
- The aggregate report classifies the failure as an output availability issue rather than an assertion failure.
- The run exits with code `1` (or `2` if the fixture file is invalid).

---

## Built-In Evaluator Reference

### 1. `exact_match`

Compares actual output with expected values using deterministic deep structural equality.

```json
{
  "type": "exact_match",
  "expected": { "status": "approved" },
  "ignoreCase": false,
  "trimWhitespace": false,
  "normalizeNewlines": false
}
```

- If `expected` is omitted from the assertion config, it defaults to `case.expected`.
- Supports primitives, arrays, nested objects, and strings.
- Whitespace, newlines, and letter casing are preserved unless explicitly overridden with `trimWhitespace`, `normalizeNewlines`, or `ignoreCase`.

---

### 2. `required_content`

Verifies that the output contains all configured required substring terms.

```json
{
  "type": "required_content",
  "terms": ["encryption", "multi-factor authentication"],
  "ignoreCase": true
}
```

- Accepts either a single string or an array of strings.
- Reports exactly which terms are missing without dumping the full output.

---

### 3. `prohibited_content`

Ensures that the output does not contain any forbidden terms, keywords, or token prefixes.

```json
{
  "type": "prohibited_content",
  "terms": ["sk_live_", "password", "INTERNAL_CONFIDENTIAL"],
  "ignoreCase": true
}
```

- Reports which prohibited term caused the failure while sanitizing and redacting surrounding sensitive payload data from logs.

---

### 4. `json` / `json_valid`

Verifies that the output is valid, parseable JSON.

```json
{
  "type": "json",
  "parseStringOnly": false
}
```

- By default, accepts raw JSON strings or pre-parsed JSON objects/arrays.
- If `parseStringOnly: true`, requires the output to be a string and parses it.
- Provides actionable syntax error messages (line and character position) upon failure.

---

### 5. `json_schema`

Validates output against a supplied JSON Schema using [Ajv](https://ajv.js.org).

```json
{
  "type": "json_schema",
  "schema": {
    "type": "object",
    "required": ["merchant", "amount", "currency"],
    "properties": {
      "merchant": { "type": "string" },
      "amount": { "type": "number", "minimum": 0 },
      "currency": { "type": "string", "pattern": "^[A-Z]{3}$" }
    },
    "additionalProperties": false
  }
}
```

- Automatically parses JSON strings if the output has not already been deserialized.
- Reports validation error paths (`instancePath`), keyword violations, and schema constraints.
- Supports standard JSON Schema formats (e.g., `date-time`, `email`, `uri`).

---

### 6. `required_fields`

Verifies that all required fields exist on a structured object.

```json
{
  "type": "required_fields",
  "fields": ["merchant", "amount", "user.profile.name", "items[0].price"]
}
```

- Supports dot notation (`user.profile.name`) and bracket indexing (`items[0].price`) for nested paths.
- Reports all missing fields in a single execution.

---

### 7. `field_types`

Validates that object properties match expected data types.

```json
{
  "type": "field_types",
  "types": {
    "merchant": "string",
    "amount": "number",
    "isTaxExempt": "boolean",
    "items": "array",
    "metadata": "object",
    "deletedAt": "null"
  }
}
```

Supported types:

- `string`: `typeof v === 'string'`
- `number`: `typeof v === 'number' && Number.isFinite(v)` (rejects `NaN` and `Infinity`)
- `boolean`: `typeof v === 'boolean'`
- `array`: `Array.isArray(v)`
- `object`: Non-null, non-array object
- `null`: `v === null`

---

### 8. Custom Evaluator Interface

Implement the `Evaluator<TConfig>` interface to define domain-specific validation rules:

```typescript
import { Evaluator, EvaluationContext, AssertionResult } from 'llm-eval-toolkit';

export interface WordCountConfig {
  minWords: number;
}

export class WordCountEvaluator implements Evaluator<WordCountConfig> {
  public readonly type = 'min_word_count';

  public evaluate(context: EvaluationContext<WordCountConfig>): AssertionResult {
    const text = String(context.actualOutput);
    const count = text.split(/\s+/).filter(Boolean).length;
    const passed = count >= context.config.minWords;

    return {
      assertionType: this.type,
      status: passed ? 'PASSED' : 'FAILED',
      message: passed
        ? `Output contains ${count} words (>= ${context.config.minWords})`
        : `Output contains only ${count} words (minimum required: ${context.config.minWords})`,
      actual: count,
      expected: context.config.minWords,
    };
  }
}
```

---

## CLI Reference

### `llm-eval run`

Run an evaluation dataset against an outputs fixture file:

```bash
llm-eval run <dataset.json> -o <outputs.json> [options]
```

**Options:**

- `-o, --outputs <path>`: **(Required)** Path to outputs JSON fixture file.
- `-r, --reporter <terminal|json>`: Reporter format (default: `terminal`).
- `--output <path>`: Write report to file instead of stdout.
- `--save-baseline <path>`: Save evaluation results as a baseline JSON file.
- `--compare-baseline <path>`: Compare results against an existing baseline file.
- `--regression-policy <policy>`: Regression policy: `fail-on-regression` (default), `fail-on-any-failure`, or `strict`.
- `--max-file-size <bytes>`: Maximum allowed input file size in bytes (default: 10 MB).
- `--debug`: Print stack traces for unexpected errors.

### `llm-eval baseline create`

Run evaluation and save the baseline:

```bash
llm-eval baseline create <dataset.json> -o <outputs.json> --output <baseline.json>
```

### `llm-eval baseline compare`

Compare an evaluation run against an existing baseline:

```bash
llm-eval baseline compare <dataset.json> -o <outputs.json> -b <baseline.json> [options]
```

### `llm-eval baseline inspect`

Inspect and validate a saved baseline:

```bash
llm-eval baseline inspect <baseline.json>
```

---

## Exit Code Contract

Shell scripts and CI pipelines rely on consistent process exit codes:

| Exit Code | Constant                           | Meaning                                                       |
| :-------: | :--------------------------------- | :------------------------------------------------------------ |
|    `0`    | `ExitCode.SUCCESS`                 | All assertions passed; no regressions detected.               |
|    `1`    | `ExitCode.EVALUATION_FAILED`       | One or more assertions failed, or an output was missing.      |
|    `2`    | `ExitCode.CONFIG_OR_DATASET_ERROR` | Malformed dataset, invalid options, or unparseable fixture.   |
|    `3`    | `ExitCode.REGRESSION_DETECTED`     | A baseline comparison detected a regression policy violation. |
|    `4`    | `ExitCode.RUNTIME_ERROR`           | File I/O failure or unexpected unhandled exception.           |

---

## Regression Detection & Baselines

Baselines track case outcomes without persisting raw prompts or sensitive outputs.

### Comparison Results

Comparing a new evaluation against a baseline classifies every test case:

- **Newly failing**: Case passed in baseline, but failed in the current run (flagged as regression).
- **Recovered**: Case failed in baseline, but now passes in the current run.
- **Remained passing**: Case passed in both baseline and current run.
- **Remained failing**: Case failed in both baseline and current run.
- **Added**: Case is new to the dataset.
- **Removed**: Case existed in baseline but was removed from dataset.

### Regression Policies

- `fail-on-regression` (default): Fails only if previously passing cases now fail.
- `fail-on-any-failure`: Fails if any test case in the current run fails, regardless of baseline.
- `strict`: Fails if newly failing cases are detected **or** if any baseline cases were removed.

---

## Programmatic API

LLM Eval Toolkit exposes a complete TypeScript programmatic API:

```typescript
import {
  loadDataset,
  loadOutputs,
  runEvaluation,
  createBaselineFromReport,
  saveBaseline,
  loadBaseline,
  compareEvaluationWithBaseline,
  TerminalReporter,
  JsonReporter,
  ExitCode,
} from 'llm-eval-toolkit';

async function main() {
  // Load & validate
  const dataset = await loadDataset('./dataset.json');
  const outputs = await loadOutputs('./outputs.json');

  // Execute
  const report = await runEvaluation(dataset, outputs);

  // Compare against baseline
  const baseline = await loadBaseline('./baseline.json');
  const regression = compareEvaluationWithBaseline(report, baseline, 'fail-on-regression');

  // Format terminal report
  const reporter = new TerminalReporter();
  console.log(reporter.format(report, regression));

  if (regression.isRegression) {
    process.exit(ExitCode.REGRESSION_DETECTED);
  }
}

main().catch(console.error);
```

---

## GitHub Actions CI Integration

Integrate evaluation and regression prevention directly into your GitHub Actions workflow:

```yaml
name: AI Output Contract Evaluation

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  evaluate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build toolkit
        run: npm run build

      - name: Run contract evaluation & check regression
        run: |
          npx llm-eval run ./examples/receipt-extraction/dataset.json \
            --outputs ./examples/receipt-extraction/outputs.json \
            --reporter terminal
```

---

## Security & Privacy Guarantees

- **Zero Network Transmission**: The evaluation engine makes zero HTTP requests and sends no telemetry.
- **No API Keys**: Evaluation executes offline against deterministic contracts.
- **No Dynamic Code Execution**: Datasets are never evaluated using `eval()`, `vm`, or child processes.
- **Path Traversal Protection**: File paths are normalized and bounded.
- **Atomic File Operations**: Baselines and reports use temporary files and atomic renames to prevent partial corruption.
- **Payload Redaction**: Reports truncate long strings and avoid dumping sensitive variables in logs.

---

## Known Limitations

- **Saved Fixtures Focus**: Tests application contracts, JSON validity, schemas, and regressions. It does not measure subjective creativity or semantic reasoning.
- **Provider Adapters**: Live API calls (e.g. OpenAI, Anthropic, Gemini) are intentionally not part of the core offline engine and belong in future extension packages.

---

## Development & Verification

### Available Scripts

- `npm run build`: Compile TypeScript with strict settings to `dist/`.
- `npm run test`: Run automated Vitest test suite.
- `npm run test:watch`: Run tests in watch mode.
- `npm run lint`: Run ESLint.
- `npm run typecheck`: Run TypeScript type checking on both `src/` and `tests/`.
- `npm run format`: Format code with Prettier.
- `npm run format:check`: Verify Prettier formatting.
- `npm run verify`: Execute linting, type checking, format checks, test suite, and build in sequence.

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our workflow and verification standards.

---

## ⚖️ Legal Disclaimer & Limitation of Liability

### 1. "AS IS" and Express Warranty Disclaimer
This software, documentation, evaluation heuristics, benchmark scorers, and regression algorithms are provided on an **"AS IS"** and **"AS AVAILABLE"** basis, **WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND**, either express, implied, statutory, or otherwise. To the maximum extent permitted by applicable law, the author, copyright holders, and contributors expressly disclaim all warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, title, quiet enjoyment, accuracy, and non-infringement.

### 2. Generative AI & Model Non-Determinism Disclaimer
- **Inherent Non-Determinism:** Large language models (LLMs) and generative artificial intelligence systems are inherently non-deterministic, probabilistic, and prone to hallucinations, inaccuracies, biases, and unexpected outputs.
- **Evaluation Heuristics vs. Ground Truth:** The evaluation metrics provided by this toolkit (including exact match, semantic similarity, toxicity, JSON schema validation, latency, and cost calculations) are heuristic and probabilistic assessments. A high benchmark score or passing evaluation does **not** guarantee that an AI model or prompt will behave reliably, safely, accurately, or appropriately in live production or under adversarial conditions.
- **High-Risk & Safety-Critical Exclusions:** This software is **NOT** certified or intended for use in evaluating AI models deployed in safety-critical, medical, healthcare, legal, financial advisory, aviation, life-support, or automated weapons systems, or any environment where AI hallucinations or inaccuracies could result in personal injury, death, or severe financial or environmental harm.

### 3. Third-Party Provider Usage & Financial Liability
- **API Charges & Rate Limits:** Any live evaluations executed against third-party AI APIs (such as OpenAI, Anthropic, Google Gemini, Mistral, Cohere, or local runtimes) use the user's own credentials, network bandwidth, and compute quotas.
- Users are solely responsible for monitoring their token consumption, API expenditures, rate limits, and compliance with the terms of service of any third-party AI provider.
- The author and contributors shall not be liable for any API billing charges, account suspensions, rate limit throttling, or provider terms violations incurred by running evaluations.

### 4. Limitation of Liability
To the maximum extent permitted by applicable law, **IN NO EVENT SHALL THE AUTHOR, COPYRIGHT HOLDERS, OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES** (including, but not limited to, loss of use, data, revenue, profits, business, or goodwill; AI hallucinations; defamation; copyright infringement by generated content; system downtime; or procurement of substitute goods or services), however caused and on any theory of liability, whether in contract, strict liability, tort (including negligence or otherwise), or statute, arising in any way out of the use, reproduction, modification, distribution, or reliance upon this software, even if advised of the possibility of such damages.

### 5. Third-Party Trademarks & Non-Affiliation
All product names, logos, brands, and registered trademarks mentioned within this project (including OpenAI, Anthropic, Google Gemini, Mistral, Meta Llama, Hugging Face, Node.js, and Vitest) are the property of their respective owners. Mention of these entities does not imply endorsement, sponsorship, or affiliation with the author.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Author

**Adam Blansett**  
Senior Full-Stack & AI Engineer

- Website: [adamblansett.com](https://adamblansett.com)
- GitHub: [@adamblansett](https://github.com/adamblansett)
