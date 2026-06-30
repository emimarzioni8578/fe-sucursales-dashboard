import { escapeCsv, buildCsv } from './export.util';

describe('export.util', () => {
  describe('escapeCsv', () => {
    it('leaves plain values untouched', () => {
      expect(escapeCsv('hola')).toBe('hola');
      expect(escapeCsv(42)).toBe('42');
    });

    it('renders null/undefined as empty string', () => {
      expect(escapeCsv(null)).toBe('');
      expect(escapeCsv(undefined)).toBe('');
    });

    it('quotes values containing a comma', () => {
      expect(escapeCsv('a,b')).toBe('"a,b"');
    });

    it('quotes values containing a semicolon or newline', () => {
      expect(escapeCsv('a;b')).toBe('"a;b"');
      expect(escapeCsv('a\nb')).toBe('"a\nb"');
    });

    it('escapes embedded double quotes by doubling them', () => {
      expect(escapeCsv('he said "hi"')).toBe('"he said ""hi"""');
    });
  });

  describe('buildCsv', () => {
    const BOM = '﻿';

    it('returns empty string for no rows', () => {
      expect(buildCsv([])).toBe('');
    });

    it('builds header + rows with a UTF-8 BOM prefix', () => {
      const csv = buildCsv(
        [{ a: 1, b: 'x' }, { a: 2, b: 'y' }],
        [{ key: 'a', header: 'A' }, { key: 'b', header: 'B' }],
      );
      expect(csv).toBe(`${BOM}A,B\n1,x\n2,y`);
    });

    it('infers columns from the first row when none are provided', () => {
      const csv = buildCsv([{ name: 'Ana', age: 30 }]);
      expect(csv).toBe(`${BOM}name,age\nAna,30`);
    });

    it('escapes field values that contain delimiters', () => {
      const csv = buildCsv([{ x: 'a,b' }], [{ key: 'x', header: 'X' }]);
      expect(csv).toBe(`${BOM}X\n"a,b"`);
    });

    it('emits empty cells for missing keys', () => {
      const csv = buildCsv([{ a: 1 }], [{ key: 'a', header: 'A' }, { key: 'missing', header: 'M' }]);
      expect(csv).toBe(`${BOM}A,M\n1,`);
    });
  });
});
