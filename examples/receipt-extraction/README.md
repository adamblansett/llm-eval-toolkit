# Example: Receipt Extraction Contract Testing

This example demonstrates using **LLM Eval Toolkit** to validate structured JSON outputs from an AI-powered receipt extraction pipeline against strict application contracts.

> **Important Note on Contract Testing**:
> Saved-output evaluation tests deterministic **application contracts** (schema validity, presence of required keys, strict typing, and exact values). It does not test the subjective reasoning or creative capabilities of an LLM. By testing against saved fixtures, your evaluation runs reproducibly in CI without requiring API keys or network calls.

## Files

- `dataset.json`: Version 1 evaluation dataset containing 4 test cases with contract assertions (`json`, `exact_match`, `required_fields`, `field_types`, and `json_schema`).
- `outputs.json`: Fixture containing model outputs corresponding to each test case.
- `receipt-schema.json`: Standalone reference JSON Schema defining the receipt structure.

## Test Cases Overview

1. `receipt-001` (PASS): Standard grocery receipt matching expected fields, types, and values.
2. `receipt-002` (PASS): Dining receipt matching schema criteria.
3. `receipt-003` (FAIL): Output is missing the required `currency` field and has a negative amount, triggering schema and required-field failures.
4. `receipt-004` (FAIL): Malformed raw JSON string output that fails JSON parsing.

## Running the Example

Run with terminal reporting:

```bash
llm-eval run ./examples/receipt-extraction/dataset.json -o ./examples/receipt-extraction/outputs.json
```

Run with machine-readable JSON reporting:

```bash
llm-eval run ./examples/receipt-extraction/dataset.json -o ./examples/receipt-extraction/outputs.json --reporter json
```

Save evaluation results as a baseline:

```bash
llm-eval run ./examples/receipt-extraction/dataset.json -o ./examples/receipt-extraction/outputs.json --save-baseline ./examples/receipt-extraction/baseline.json
```

Inspect the baseline:

```bash
llm-eval baseline inspect ./examples/receipt-extraction/baseline.json
```

## Example Terminal Output

```text
LLM Eval Report: receipt-extraction (v1)
Time: 2026-10-09T20:45:03.850Z | Duration: 19.9ms
──────────────────────────────────────────────────────
Evaluation Summary:
  Total cases:       4
  Passed cases:      2
  Failed cases:      2
  Pass rate:         50.0%

Assertions:
  Total: 10 | Passed: 7 | Failed: 3 | Errors: 0

──────────────────────────────────────────────────────
Failures & Errors (2):

✗ receipt-003 - Failure case: Missing currency field and negative amount
    • [required_fields]: Missing required field(s): "currency"
    • [json_schema]: Output failed JSON Schema validation (2 issue(s)): at "/": must have required property 'currency'; at "/amount": must be >= 0

✗ receipt-004 - Failure case: Malformed raw JSON string output
    • [json]: Output is not valid JSON: Expected property name or '}' in JSON at position 1 (line 1 column 2)
──────────────────────────────────────────────────────
Result: FAILED
```
