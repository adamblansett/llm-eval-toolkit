# LLM Eval Toolkit

**Contract-based testing and regression detection for AI application outputs.**

LLM Eval Toolkit is an open-source testing framework for developers building applications powered by large language models (LLMs). It validates AI outputs against explicit requirements, detects regressions between evaluation runs, and integrates with automated development workflows.

The goal is simple: make it easier to catch AI output failures before they reach production.

## Why This Project Exists

Traditional software tests typically evaluate deterministic behavior. LLM-powered applications introduce additional challenges: outputs may vary, structured responses may violate their schemas, and seemingly small prompt or model changes can break downstream application logic.

LLM Eval Toolkit helps developers test these behaviors systematically.

It focuses on **verifiable application contracts**, including:

- Required fields and data types.
- JSON and JSON Schema compliance.
- Exact-match requirements.
- Required and prohibited phrases.
- Application-specific validation rules.
- Changes in evaluation results between runs.

The initial implementation is designed to run locally without paid APIs, external model calls, or transmitting evaluation data to third parties.

## Core Features

> Development status: Planned. Features listed below are design goals until implemented and verified by automated tests.

### Dataset-Driven Evaluations

Define evaluation cases in JSON files.

Each case can specify an input, expected output properties, validation requirements, and optional reference data.

### Structured Output Validation

Validate generated outputs against JSON Schema or supported TypeScript-friendly schema definitions.

Detect missing fields, invalid types, malformed JSON, and other contract violations.

### Deterministic Assertions

Evaluate outputs using reproducible checks:

- Exact-match assertions.
- Required-content assertions.
- Prohibited-content assertions.
- JSON parsing.
- Schema validation.
- Custom validation rules.

Deterministic assertions are designed to produce consistent results for the same inputs and configuration.

### Regression Detection

Compare evaluation runs to identify changes in behavior.

Reports should distinguish between:

- Newly passing cases.
- Newly failing cases.
- Cases that continue to pass.
- Cases that continue to fail.
- Changes in overall evaluation results.

### CI Integration

Use the toolkit in GitHub Actions and other automated pipelines.

Configurable failure thresholds allow teams to prevent regressions from silently passing through their development workflow.

### Machine-Readable Reports

Generate structured JSON reports for CI systems and downstream tooling.

Human-readable terminal output provides a quick overview of evaluation results.

HTML reporting may be added in a future release.

### Provider-Independent Architecture

Keep the evaluation engine independent of any specific LLM provider.

Provider adapters can be added separately to support live model evaluation when needed.

The core testing engine should remain useful without API credentials.

## Example Use Case

Suppose an application uses an LLM to extract transaction details from a receipt.

The application expects structured data:

```json
{
  "merchant": "Example Store",
  "amount": 42.50,
  "currency": "USD",
  "category": "groceries"
}
```

A valid response must contain all required fields, use the correct data types, and satisfy the application's business rules.

The toolkit can validate these requirements and report failures when the output is malformed or incomplete.

For example:

```text
Evaluation Results
------------------
Total cases:       20
Passed:            17
Failed:             3
Pass rate:        85.0%

Failures:
  receipt-004: Missing required field "currency"
  receipt-009: Invalid type for field "amount"
  receipt-015: Output failed schema validation

Result: FAILED
```

*Illustrative output only; actual output depends on the implemented reporting format and evaluated test cases.*

This type of testing is particularly useful when changing prompts, updating models, or modifying application code that depends on AI-generated data.

## Installation

Installation instructions will be added once the package is implemented and published.

During development, clone the repository and install its dependencies:

```bash
git clone https://github.com/adamblansett/llm-eval-toolkit.git
cd llm-eval-toolkit
npm install
```

Run the test suite:

```bash
npm test
```

The commands above describe the intended development workflow and will be verified against the actual implementation.

## Usage

The following illustrates the intended interface. Exact command names and configuration options may change during development.

Create an evaluation dataset:

```json
{
  "name": "receipt-extraction",
  "cases": [
    {
      "id": "receipt-001",
      "input": "Extract the transaction details.",
      "expected": {
        "merchant": "Example Store",
        "amount": 42.5,
        "currency": "USD",
        "category": "groceries"
      },
      "assertions": [
        {
          "type": "json"
        },
        {
          "type": "required_fields",
          "fields": [
            "merchant",
            "amount",
            "currency",
            "category"
          ]
        }
      ]
    }
  ]
}
```

Provide an output fixture or integrate the evaluator with an application-specific test harness.

Run the evaluation:

```bash
llm-eval run ./evaluations/receipt-extraction.json
```

Export machine-readable results:

```bash
llm-eval run ./evaluations/receipt-extraction.json --reporter json
```

These commands represent the proposed CLI. They should not be considered available until implemented.

## Design Principles

### 1. Deterministic Core

Core assertions should be reproducible and independently testable.

### 2. No Mandatory API Keys

Basic evaluation must not require an external AI provider or paid service.

### 3. Explicit Contracts

Tests should describe the properties an application requires rather than relying exclusively on subjective assessments.

### 4. Clear Failure Reporting

Every failed assertion should explain what failed and, where practical, identify the relevant input, output, and expected condition.

### 5. Provider Independence

The evaluation engine should not be tightly coupled to one model vendor.

### 6. Privacy by Default

Evaluation data should remain local unless users explicitly configure integrations that transmit it elsewhere.

### 7. CI-Friendly Behavior

Exit codes and machine-readable reports should make the toolkit straightforward to integrate into automated workflows.

## Technology Stack

The planned implementation uses:

- **TypeScript** for the core engine and CLI.
- **Node.js** for execution.
- **Commander** for CLI argument parsing.
- **JSON Schema** for structured output validation.
- **Vitest** for automated testing.
- **GitHub Actions** for continuous integration.
- **npm** for package management and distribution.

Dependencies will be selected based on maintainability, licensing, security, and compatibility.

## Roadmap

### Phase 1: Evaluation Engine

- [ ] Establish the TypeScript project structure.
- [ ] Define a versioned evaluation dataset format.
- [ ] Implement dataset parsing and validation.
- [ ] Implement JSON parsing and schema validation.
- [ ] Implement exact-match assertions.
- [ ] Implement required-content and prohibited-content assertions.
- [ ] Add terminal and JSON reporters.
- [ ] Define consistent exit codes.
- [ ] Add automated unit and integration tests.

### Phase 2: Regression Testing

- [ ] Implement baseline storage.
- [ ] Compare evaluation results between runs.
- [ ] Identify newly failing test cases.
- [ ] Add configurable regression thresholds.
- [ ] Provide GitHub Actions integration examples.

### Phase 3: Extensibility

- [ ] Define a public evaluator interface.
- [ ] Support custom validation rules.
- [ ] Add application integration examples.
- [ ] Evaluate optional HTML reporting.
- [ ] Document extension development.

### Phase 4: Optional Model-Based Evaluation

- [ ] Design provider adapter interfaces.
- [ ] Support explicitly configured model-based evaluators.
- [ ] Document evaluator limitations and nondeterminism.
- [ ] Track evaluation costs where provider data is available.
- [ ] Add safeguards around sensitive inputs and external transmission.

## What This Tool Does Not Promise

LLM Eval Toolkit is intended to make AI application behavior more testable. It cannot guarantee that an LLM response is factually correct, unbiased, safe, or appropriate simply because it passes a collection of deterministic assertions.

Model-based evaluation can also be inconsistent and should be treated as a separate, explicitly configured capability.

The toolkit is designed to complement ordinary unit tests, integration tests, monitoring, and application-specific validation—not replace them.

## Contributing

Contributions are welcome.

Please open an issue before undertaking major changes so the proposed design can be discussed.

When submitting a pull request:

1. Include tests for new behavior.
2. Preserve existing functionality unless a change is intentional.
3. Document changes to public interfaces.
4. Avoid introducing mandatory external services into the core engine.
5. Run the test suite and lint checks.

Contribution instructions will be expanded as the project matures.

## License

This project is intended to be released under the MIT License.

The repository will include the full license text before its first release.

## Author

**Adam Blansett**  
Senior Full-Stack & AI Engineer

- Website: https://adamblansett.com
- GitHub: https://github.com/adamblansett

Building practical tools for reliable software, AI application development, and production engineering.
