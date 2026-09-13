import { describe, expect, it } from 'vitest';
import { messageCreateInputSchema } from './message';

describe('messageCreateInputSchema', () => {
  it('accepts a valid message body', () => {
    const result = messageCreateInputSchema.parse({ body: 'When can we drop off the car?' });
    expect(result.body).toBe('When can we drop off the car?');
  });

  it('trims surrounding whitespace', () => {
    const result = messageCreateInputSchema.parse({ body: '  hello  ' });
    expect(result.body).toBe('hello');
  });

  it('rejects an empty body', () => {
    expect(() => messageCreateInputSchema.parse({ body: '' })).toThrow();
  });

  it('rejects a body over 2000 characters', () => {
    expect(() => messageCreateInputSchema.parse({ body: 'a'.repeat(2001) })).toThrow();
  });

  it('rejects a missing body', () => {
    expect(() => messageCreateInputSchema.parse({})).toThrow();
  });
});
