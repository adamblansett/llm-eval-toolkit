# Modern Evaluators and JSON Lines Example

This example demonstrates modern features of **LLM Eval Toolkit**:

- **JSON Lines (`.jsonl`)** streaming dataset and output fixture formats.
- **Numeric Range (`numeric_range`)** evaluation with tolerance.
- **Regular Expression (`regex_match`)** validation.
- **Deterministic Similarity (`similarity`)** using token Jaccard and Levenshtein metrics.
- **Markdown Code Fence Stripping (`stripCodeFences: true`)** for robust JSON evaluation when LLMs wrap outputs in `json ... ` blocks.
- **Case Tagging & Filtering** (`--tag`).

## Running This Example

### 1. Validate the Dataset

```bash
llm-eval dataset validate examples/jsonl-and-modern-evaluators/dataset.jsonl
```

### 2. Run the Evaluation

```bash
llm-eval run examples/jsonl-and-modern-evaluators/dataset.jsonl -o examples/jsonl-and-modern-evaluators/outputs.jsonl
```

### 3. Filter by Tag

```bash
llm-eval run examples/jsonl-and-modern-evaluators/dataset.jsonl -o examples/jsonl-and-modern-evaluators/outputs.jsonl --tag math
```

### 4. Render as Markdown or JUnit XML

```bash
llm-eval run examples/jsonl-and-modern-evaluators/dataset.jsonl -o examples/jsonl-and-modern-evaluators/outputs.jsonl --reporter markdown
llm-eval run examples/jsonl-and-modern-evaluators/dataset.jsonl -o examples/jsonl-and-modern-evaluators/outputs.jsonl --reporter junit
```
