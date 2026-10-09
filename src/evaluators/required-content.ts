import type { RequiredContentAssertionConfig } from '../datasets/types.js';
import type { Evaluator, EvaluationContext, AssertionResult } from './types.js';

export class RequiredContentEvaluator implements Evaluator<RequiredContentAssertionConfig> {
  public readonly type = 'required_content';

  public evaluate(context: EvaluationContext<RequiredContentAssertionConfig>): AssertionResult {
    const start = performance.now();
    const config = context.config;
    const rawTerms = Array.isArray(config.terms) ? config.terms : [config.terms];
    const terms = rawTerms.filter((t) => typeof t === 'string' && t.length > 0);

    if (terms.length === 0) {
      return {
        assertionType: this.type,
        status: 'ERROR',
        message: 'No required terms specified in assertion config',
        durationMs: performance.now() - start,
      };
    }

    const actual = context.actualOutput;
    let textToSearch: string;
    if (typeof actual === 'string') {
      textToSearch = actual;
    } else if (actual === null || actual === undefined) {
      textToSearch = '';
    } else {
      try {
        textToSearch = JSON.stringify(actual);
      } catch {
        textToSearch = String(actual);
      }
    }

    const ignoreCase = Boolean(config.ignoreCase);
    const searchTarget = ignoreCase ? textToSearch.toLowerCase() : textToSearch;

    const missingTerms: string[] = [];

    for (const term of terms) {
      const termToFind = ignoreCase ? term.toLowerCase() : term;
      if (!searchTarget.includes(termToFind)) {
        missingTerms.push(term);
      }
    }

    const passed = missingTerms.length === 0;

    return {
      assertionType: this.type,
      status: passed ? 'PASSED' : 'FAILED',
      message: passed
        ? `Output contains all ${terms.length} required term(s)`
        : `Output is missing ${missingTerms.length} required term(s): ${missingTerms.map((t) => JSON.stringify(t)).join(', ')}`,
      expected: terms,
      diagnostics: {
        missingTerms,
        foundCount: terms.length - missingTerms.length,
        totalTerms: terms.length,
      },
      durationMs: performance.now() - start,
    };
  }
}
