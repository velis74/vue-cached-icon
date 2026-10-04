import { globalCache } from './cache';

describe('globalCache', () => {
  beforeEach(() => globalCache.clear());

  it('reports missing keys and returns undefined for them', async () => {
    expect(globalCache.check('missing')).toBe(false);
    expect(await globalCache.get('missing')).toBeUndefined();
  });
  it('returns a stored string as is', async () => {
    globalCache.set('icon', '<svg></svg>');
    expect(globalCache.check('icon')).toBe(true);
    expect(await globalCache.get('icon')).toBe('<svg></svg>');
  });
  it('resolves a stored request promise to its data', async () => {
    globalCache.set('icon', Promise.resolve({ data: '<svg id="pending"></svg>' }));
    expect(globalCache.check('icon')).toBe(true);
    expect(await globalCache.get('icon')).toBe('<svg id="pending"></svg>');
  });
  it('propagates a rejected request promise', async () => {
    const failed = Promise.reject(new Error('bad url'));
    globalCache.set('icon', failed);
    await expect(globalCache.get('icon')).rejects.toThrow('bad url');
  });
  it('forgets every entry on clear', () => {
    globalCache.set('a', '<svg></svg>');
    globalCache.set('b', '<svg></svg>');
    globalCache.clear();
    expect(globalCache.check('a')).toBe(false);
    expect(globalCache.check('b')).toBe(false);
  });
});
