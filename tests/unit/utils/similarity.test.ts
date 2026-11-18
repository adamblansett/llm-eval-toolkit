import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  levenshteinSimilarity,
  jaccardSimilarity,
} from '../../../src/utils/similarity.js';

describe('similarity utils', () => {
  describe('levenshteinDistance', () => {
    it('returns 0 for identical strings', () => {
      expect(levenshteinDistance('kitten', 'kitten')).toBe(0);
      expect(levenshteinDistance('', '')).toBe(0);
    });

    it('returns length of other string when one is empty', () => {
      expect(levenshteinDistance('hello', '')).toBe(5);
      expect(levenshteinDistance('', 'world')).toBe(5);
    });

    it('calculates classic edit distance accurately', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('flaw', 'lawn')).toBe(2);
      expect(levenshteinDistance('gumbo', 'gambol')).toBe(2);
    });
  });

  describe('levenshteinSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      expect(levenshteinSimilarity('hello', 'hello')).toBe(1.0);
      expect(levenshteinSimilarity('', '')).toBe(1.0);
    });

    it('returns 0.0 for completely disjoint strings of same length', () => {
      expect(levenshteinSimilarity('abc', 'xyz')).toBe(0.0);
    });

    it('computes correct normalized ratio between 0 and 1', () => {
      // kitten to sitting: maxLen 7, dist 3 -> 1 - 3/7 ≈ 0.5714
      const sim = levenshteinSimilarity('kitten', 'sitting');
      expect(sim).toBeCloseTo(4 / 7, 4);
    });
  });

  describe('jaccardSimilarity', () => {
    it('returns 1.0 for identical token sets', () => {
      expect(jaccardSimilarity('the quick brown fox', 'the quick brown fox')).toBe(1.0);
      expect(jaccardSimilarity('', '')).toBe(1.0);
    });

    it('returns 0.0 for disjoint token sets', () => {
      expect(jaccardSimilarity('apple banana', 'orange pear')).toBe(0.0);
    });

    it('handles differing word orders accurately', () => {
      expect(jaccardSimilarity('apple banana orange', 'orange banana apple')).toBe(1.0);
    });

    it('computes intersection over union correctly', () => {
      // A: {apple, banana, grape} (3)
      // B: {banana, grape, orange, pear} (4)
      // Intersection: {banana, grape} (2)
      // Union: {apple, banana, grape, orange, pear} (5)
      // Similarity: 2 / 5 = 0.4
      expect(jaccardSimilarity('apple banana grape', 'banana grape orange pear')).toBe(0.4);
    });
  });
});
