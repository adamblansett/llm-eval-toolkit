import { describe, it, expect } from 'vitest';
import { getValueByPath, tokenizePath } from '../../../src/utils/property-path.js';

describe('property-path utility', () => {
  it('tokenizes dot and bracket paths correctly', () => {
    expect(tokenizePath('a.b.c')).toEqual(['a', 'b', 'c']);
    expect(tokenizePath('items[0].name')).toEqual(['items', '0', 'name']);
    expect(tokenizePath('data[1][2].value')).toEqual(['data', '1', '2', 'value']);
    expect(tokenizePath('')).toEqual([]);
  });

  it('retrieves nested object values', () => {
    const obj = {
      user: {
        profile: {
          name: 'Alice',
          age: 30,
        },
      },
    };

    expect(getValueByPath(obj, 'user.profile.name')).toEqual({ found: true, value: 'Alice' });
    expect(getValueByPath(obj, 'user.profile.age')).toEqual({ found: true, value: 30 });
    expect(getValueByPath(obj, 'user.profile.missing')).toEqual({ found: false, value: undefined });
    expect(getValueByPath(obj, 'user.other.missing')).toEqual({ found: false, value: undefined });
  });

  it('retrieves nested array elements', () => {
    const obj = {
      items: [
        { id: 'item-1', price: 10 },
        { id: 'item-2', price: 20 },
      ],
    };

    expect(getValueByPath(obj, 'items[0].id')).toEqual({ found: true, value: 'item-1' });
    expect(getValueByPath(obj, 'items.1.price')).toEqual({ found: true, value: 20 });
    expect(getValueByPath(obj, 'items[5]')).toEqual({ found: false, value: undefined });
  });

  it('handles primitive, null, or undefined roots safely', () => {
    expect(getValueByPath(null, 'a.b')).toEqual({ found: false, value: undefined });
    expect(getValueByPath(undefined, 'a.b')).toEqual({ found: false, value: undefined });
    expect(getValueByPath('string', 'a.b')).toEqual({ found: false, value: undefined });
    expect(getValueByPath(42, 'a.b')).toEqual({ found: false, value: undefined });
    expect(getValueByPath({ a: 1 }, '')).toEqual({ found: true, value: { a: 1 } });
  });

  it('handles quoted and hyphenated keys in bracket notation', () => {
    const data = {
      'first-name': 'Alice',
      user: {
        'api-key': 'secret-123',
        'sub.domain': 'api.example.com',
      },
    };

    expect(tokenizePath("['first-name']")).toEqual(['first-name']);
    expect(tokenizePath('user["api-key"]')).toEqual(['user', 'api-key']);
    expect(getValueByPath(data, "['first-name']")).toEqual({ found: true, value: 'Alice' });
    expect(getValueByPath(data, "user['api-key']")).toEqual({ found: true, value: 'secret-123' });
    expect(getValueByPath(data, 'user["sub.domain"]')).toEqual({
      found: true,
      value: 'api.example.com',
    });
  });

  it('refuses access to prototype pollution properties', () => {
    const data = { a: 1 };
    expect(getValueByPath(data, '__proto__.isAdmin')).toEqual({ found: false, value: undefined });
    expect(getValueByPath(data, 'constructor.prototype.isAdmin')).toEqual({
      found: false,
      value: undefined,
    });
    expect(getValueByPath(data, 'prototype.isAdmin')).toEqual({ found: false, value: undefined });
  });
});
