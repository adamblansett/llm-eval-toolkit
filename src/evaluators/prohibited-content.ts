import type { ProhibitedContentAssertionConfig } from '../datasets/types.js';
import type { Evaluator, EvaluationContext, AssertionResult } from './types.js';

export class ProhibitedContentEvaluator implements Evaluator<ProhibitedContentAssertionConfig> {
  public readonly type = 'prohibited_content';

  public evaluate(context: EvaluationContext<ProhibitedContentAssertionConfig>): AssertionResult {
    const start = performance.now();
    const config = context.config;
    const rawTerms = Array.isArray(config.terms) ? config.terms : [config.terms];
    const terms = rawTerms.filter((t) => typeof t === 'string' && t.length > 0);

    if (terms.length === 0) {
      return {
        assertionType: this.type,
        status: 'ERROR',
        message: 'No prohibited terms specified in assertion config',
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

    const detectedProhibitedTerms: string[] = [];

    for (const term of terms) {
      const termToFind = ignoreCase ? term.toLowerCase() : term;
      if (searchTarget.includes(termToFind)) {
        detectedProhibitedTerms.push(term);
      }
    }

    const passed = detectedProhibitedTerms.length === 0;

    return {
      assertionType: this.type,
      status: passed ? 'PASSED' : 'FAILED',
      message: passed
        ? 'Output contains no prohibited content'
        : `Output contains prohibited term(s): ${detectedProhibitedTerms.map((t) => JSON.stringify(t)).join(', ')}`,
      diagnostics: {
        detectedProhibitedTerms,
      },
      durationMs: performance.now() - start,
    };
  }
}
