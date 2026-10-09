# Contributing to LLM Eval Toolkit

Thank you for your interest in contributing to LLM Eval Toolkit!

## Development Guidelines

1. **Deterministic Core**: Core evaluations must remain reproducible, offline, and independent of live external APIs or network calls.
2. **Type Safety**: Maintain strict TypeScript typing. Avoid `any` where a concrete type can be expressed.
3. **Quality & Verification**: Before submitting changes, ensure all tests, lint checks, type checks, and formatting pass:
   ```bash
   npm run verify
   ```
4. **Testing**: Write unit tests for new evaluators or utilities, and integration tests for CLI commands and regression behaviors.
5. **Security**: Treat dataset files, configuration, and LLM output fixtures as untrusted inputs. Validate schemas and prevent path traversal.

## Workflow

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a feature branch.
4. Run tests in watch mode during development:
   ```bash
   npm run test:watch
   ```
5. Format and verify your code before opening a pull request:
   ```bash
   npm run format
   npm run verify
   ```

## Code of Conduct

Be welcoming, respectful, and collaborative.
