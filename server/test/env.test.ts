import { describe, expect, it } from 'vitest';

import { parseOrigins } from '../src/env';

describe('parseOrigins', () => {
  it('trims spaces and trailing slashes', () => {
    expect(parseOrigins(' https://lilac.vercel.app/ , http://localhost:8081 ')).toEqual([
      'https://lilac.vercel.app',
      'http://localhost:8081',
    ]);
  });
  it('drops blanks, so an empty setting means no origins', () => {
    expect(parseOrigins('')).toEqual([]);
    expect(parseOrigins(' , ')).toEqual([]);
  });
});
