import type { SimilarityAssertionConfig } from '../datasets/types.js';
import type { Evaluator, EvaluationContext, AssertionResult } from './types.js';
import { getValueByPath } from '../utils/property-path.js';
import { safePreview } from '../utils/sanitizer.js';
import { levenshteinSimilarity, jaccardSimilarity } from '../utils/similarity.js';

export class SimilarityEvaluator implements Evaluator<SimilarityAssertionConfig> {
  public readonly type: string;

  constructor(type = 'similarity') {
    this.type = type;
  }

  public evaluate(context: EvaluationContext<SimilarityAssertionConfig>): AssertionResult {
    const start = performance.now();
    const config = context.config;

    let targetValue: unknown = context.actualOutput;
    const pathDesc = config.path ? ` at path "${config.path}"` : '';

    if (config.path) {
      const lookup = getValueByPath(context.actualOutput, config.path);
      if (!lookup.found) {
        return {
          assertionType: this.type,
          status: 'FAILED',
          message: `Field${pathDesc} does not exist in output`,
          durationMs: performance.now() - start,
        };
      }
      targetValue = lookup.value;
    }

    if (targetValue === null || targetValue === undefined) {
      return {
        assertionType: this.type,
        status: 'FAILED',
        message: `Expected string value${pathDesc}, but received ${String(targetValue)}`,
        durationMs: performance.now() - start,
      };
    }

    let actualStr = typeof targetValue === 'string' ? targetValue : JSON.stringify(targetValue);
    let expectedStr = config.expected;

    if (config.trimWhitespace) {
      actualStr = actualStr.trim();
      expectedStr = expectedStr.trim();
    }

    if (config.ignoreCase) {
      actualStr = actualStr.toLowerCase();
      expectedStr = expectedStr.toLowerCase();
    }

    const algorithm = config.algorithm ?? 'levenshtein';
    let score: number;
    try {
      score =
        algorithm === 'jaccard'
          ? jaccardSimilarity(actualStr, expectedStr)
          : levenshteinSimilarity(actualStr, expectedStr);
    } catch (err: unknown) {
      const error = err as Error;
      return {
        assertionType: this.type,
        status: 'ERROR',
        message: `Similarity evaluation error${pathDesc}: ${error.message}`,
        durationMs: performance.now() - start,
      };
    }

    const roundedScore = Number(score.toFixed(4));
    const passed = roundedScore >= config.minThreshold;

    if (!passed) {
      return {
        assertionType: this.type,
        status: 'FAILED',
        message: `Similarity score ${roundedScore}${pathDesc} is below minimum threshold ${config.minThreshold} (${algorithm}): received ${safePreview(actualStr)}`,
        expected: `Similarity >= ${config.minThreshold} with "${safePreview(expectedStr)}"`,
        actual: `Score: ${roundedScore}`,
        diagnostics: {
          algorithm,
          score: roundedScore,
          threshold: config.minThreshold,
        },
        durationMs: performance.now() - start,
      };
    }

    return {
      assertionType: this.type,
      status: 'PASSED',
      message: `Similarity score ${roundedScore}${pathDesc} satisfies minimum threshold ${config.minThreshold} (${algorithm})`,
      actual: `Score: ${roundedScore}`,
      diagnostics: {
        algorithm,
        score: roundedScore,
        threshold: config.minThreshold,
      },
      durationMs: performance.now() - start,
    };
  }
}
