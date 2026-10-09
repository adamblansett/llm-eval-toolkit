# Example: Content Assertions (Required and Prohibited Text)

This example demonstrates using **LLM Eval Toolkit** with `required_content` and `prohibited_content` assertions to verify that outputs contain required terms and do not leak sensitive or prohibited content.

## Files

- `dataset.json`: Dataset defining test cases with required terms and prohibited terms (with `ignoreCase` support).
- `outputs.json`: Saved outputs illustrating a passing case and a failing case leaking an API key prefix.

## Running the Example

```bash
llm-eval run ./examples/content-assertions/dataset.json -o ./examples/content-assertions/outputs.json
```

## Example Terminal Output

```text
LLM Eval Report: content-assertions-example (v1)
Time: 2026-10-09T20:45:59.786Z | Duration: 0.5ms
──────────────────────────────────────────────────────
Evaluation Summary:
  Total cases:       2
  Passed cases:      1
  Failed cases:      1
  Pass rate:         50.0%

Assertions:
  Total: 4 | Passed: 3 | Failed: 1 | Errors: 0

──────────────────────────────────────────────────────
Failures & Errors (1):

✗ content-002 - Failing case: Leaks prohibited internal token
    • [prohibited_content]: Output contains prohibited term(s): "sk_live_"
──────────────────────────────────────────────────────
Result: FAILED
```
