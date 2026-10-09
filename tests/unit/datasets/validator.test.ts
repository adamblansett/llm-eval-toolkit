import { describe, it, expect } from 'vitest';
import { validateDataset, DatasetValidationError } from '../../../src/datasets/validator.js';

describe('validateDataset', () => {
  const validBaseDataset = {
    version: 1,
    name: 'test-dataset',
    cases: [
      {
        id: 'case-001',
        input: 'Test input',
        expected: 'Test expected',
        assertions: [{ type: 'exact_match' }, { type: 'required_content', terms: ['Test'] }],
      },
    ],
  };

  it('validates a correct dataset successfully', () => {
    const validated = validateDataset(validBaseDataset);
    expect(validated.name).toBe('test-dataset');
    expect(validated.cases.length).toBe(1);
  });

  it('rejects non-object root', () => {
    expect(() => validateDataset('not-an-object')).toThrow(DatasetValidationError);
    expect(() => validateDataset(null)).toThrow(DatasetValidationError);
    expect(() => validateDataset([1, 2, 3])).toThrow(DatasetValidationError);
  });

  it('rejects missing or unsupported version', () => {
    expect(() => validateDataset({ ...validBaseDataset, version: undefined })).toThrow(
      /Missing required "version"/,
    );
    expect(() => validateDataset({ ...validBaseDataset, version: 2 })).toThrow(
      /Unsupported dataset version: 2/,
    );
  });

  it('rejects missing or empty dataset name', () => {
    expect(() => validateDataset({ ...validBaseDataset, name: '' })).toThrow(
      /non-empty string "name"/,
    );
    expect(() => validateDataset({ ...validBaseDataset, name: '   ' })).toThrow(
      /non-empty string "name"/,
    );
  });

  it('rejects empty cases array', () => {
    expect(() => validateDataset({ ...validBaseDataset, cases: [] })).toThrow(
      /must contain at least one case/,
    );
  });

  it('detects duplicate case IDs with actionable messages', () => {
    const datasetWithDups = {
      ...validBaseDataset,
      cases: [
        {
          id: 'duplicate-id',
          input: 'input 1',
          assertions: [{ type: 'json' }],
        },
        {
          id: 'duplicate-id',
          input: 'input 2',
          assertions: [{ type: 'json' }],
        },
      ],
    };

    try {
      validateDataset(datasetWithDups);
      expect.fail('Should have thrown DatasetValidationError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(DatasetValidationError);
      const error = err as DatasetValidationError;
      expect(error.message).toContain('Duplicate case ID "duplicate-id"');
      expect(error.issues.some((i) => i.caseId === 'duplicate-id')).toBe(true);
    }
  });

  it('rejects empty case ID', () => {
    const invalidCase = {
      ...validBaseDataset,
      cases: [
        {
          id: '',
          input: 'test',
          assertions: [{ type: 'json' }],
        },
      ],
    };
    expect(() => validateDataset(invalidCase)).toThrow(/non-empty string "id"/);
  });

  it('rejects unknown assertion types with suggestions', () => {
    const invalidAssertion = {
      ...validBaseDataset,
      cases: [
        {
          id: 'case-001',
          input: 'test',
          assertions: [{ type: 'non_existent_assertion' }],
        },
      ],
    };

    expect(() => validateDataset(invalidAssertion)).toThrow(
      /Unknown assertion type "non_existent_assertion"/,
    );
  });

  it('rejects exact_match when neither case nor config specifies expected', () => {
    const invalidExactMatch = {
      version: 1,
      name: 'exact-match-dataset',
      cases: [
        {
          id: 'case-001',
          input: 'test',
          // no expected
          assertions: [{ type: 'exact_match' }],
        },
      ],
    };

    expect(() => validateDataset(invalidExactMatch)).toThrow(
      /exact_match assertion in case "case-001" requires either an "expected" property/,
    );
  });

  it('rejects invalid assertion options per type', () => {
    // required_fields with empty fields
    expect(() =>
      validateDataset({
        ...validBaseDataset,
        cases: [
          {
            id: 'case-001',
            input: 'test',
            assertions: [{ type: 'required_fields', fields: [] }],
          },
        ],
      }),
    ).toThrow(/Invalid required_fields/);

    // json_schema with empty schema
    expect(() =>
      validateDataset({
        ...validBaseDataset,
        cases: [
          {
            id: 'case-001',
            input: 'test',
            assertions: [{ type: 'json_schema', schema: {} }],
          },
        ],
      }),
    ).toThrow(/JSON Schema must not be an empty object/);

    // field_types with unsupported type
    expect(() =>
      validateDataset({
        ...validBaseDataset,
        cases: [
          {
            id: 'case-001',
            input: 'test',
            assertions: [{ type: 'field_types', types: { x: 'invalid_type' } }],
          },
        ],
      }),
    ).toThrow(/Invalid field_types/);
  });

  it('allows custom assertion types when specified in options', () => {
    const customDataset = {
      ...validBaseDataset,
      cases: [
        {
          id: 'case-001',
          input: 'test',
          assertions: [{ type: 'my_custom_checker' }],
        },
      ],
    };

    const validated = validateDataset(customDataset, {
      knownCustomTypes: ['my_custom_checker'],
    });
    expect(validated).toBeDefined();
  });

  it('rejects unexpected properties at dataset root', () => {
    expect(() =>
      validateDataset({
        ...validBaseDataset,
        unexpected_root_prop: 'bad',
      }),
    ).toThrow(/Unexpected property "unexpected_root_prop" at dataset root/);
  });

  it('rejects unexpected properties on individual cases', () => {
    expect(() =>
      validateDataset({
        ...validBaseDataset,
        cases: [
          {
            ...validBaseDataset.cases[0],
            unexpected_case_prop: 123,
          },
        ],
      }),
    ).toThrow(/Unexpected property "unexpected_case_prop" in case "case-001"/);
  });

  it('rejects unrecognized properties in assertion configuration due to strict schemas', () => {
    expect(() =>
      validateDataset({
        ...validBaseDataset,
        cases: [
          {
            id: 'c1',
            input: 'hi',
            assertions: [
              {
                type: 'required_content',
                terms: ['hello'],
                ignorecase: true, // misspelled ignoreCase
              },
            ],
          },
        ],
      }),
    ).toThrow(DatasetValidationError);
  });
});
