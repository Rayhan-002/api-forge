import { describe, expect, it } from 'vitest';

import type { Collection } from '@/types/collections';
import {
  buildCollectionPathLabels,
  buildCollectionTree,
  getDescendantIds,
} from './collection-tree';

function makeCollection(
  overrides: Partial<Collection> & Pick<Collection, 'id' | 'name'>,
): Collection {
  return {
    description: '',
    parent: null,
    request_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('buildCollectionTree', () => {
  it('places collections with no parent at the root', () => {
    const collections = [
      makeCollection({ id: 'a', name: 'A' }),
      makeCollection({ id: 'b', name: 'B' }),
    ];

    const tree = buildCollectionTree(collections);

    expect(tree).toHaveLength(2);
    expect(tree.map((n) => n.collection.id).sort()).toEqual(['a', 'b']);
    expect(tree.every((n) => n.children.length === 0)).toBe(true);
  });

  it('nests a child under its parent, not at the root', () => {
    const collections = [
      makeCollection({ id: 'parent', name: 'Parent' }),
      makeCollection({ id: 'child', name: 'Child', parent: 'parent' }),
    ];

    const tree = buildCollectionTree(collections);

    expect(tree).toHaveLength(1);
    expect(tree[0].collection.id).toBe('parent');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].collection.id).toBe('child');
  });

  it('nests multiple levels deep', () => {
    const collections = [
      makeCollection({ id: 'a', name: 'A' }),
      makeCollection({ id: 'b', name: 'B', parent: 'a' }),
      makeCollection({ id: 'c', name: 'C', parent: 'b' }),
    ];

    const tree = buildCollectionTree(collections);

    expect(tree[0].collection.id).toBe('a');
    expect(tree[0].children[0].collection.id).toBe('b');
    expect(tree[0].children[0].children[0].collection.id).toBe('c');
  });

  it('returns an empty tree for an empty list', () => {
    expect(buildCollectionTree([])).toEqual([]);
  });
});

describe('buildCollectionPathLabels', () => {
  it('labels a root collection with just its own name', () => {
    const collections = [makeCollection({ id: 'a', name: 'A' })];
    const labels = buildCollectionPathLabels(collections);
    expect(labels.get('a')).toBe('A');
  });

  it('joins ancestor names with " / " for a nested collection', () => {
    const collections = [
      makeCollection({ id: 'a', name: 'Company API' }),
      makeCollection({ id: 'b', name: 'Auth', parent: 'a' }),
      makeCollection({ id: 'c', name: 'Tokens', parent: 'b' }),
    ];

    const labels = buildCollectionPathLabels(collections);

    expect(labels.get('a')).toBe('Company API');
    expect(labels.get('b')).toBe('Company API / Auth');
    expect(labels.get('c')).toBe('Company API / Auth / Tokens');
  });
});

describe('getDescendantIds', () => {
  it('returns an empty set for a collection with no children', () => {
    const collections = [makeCollection({ id: 'a', name: 'A' })];
    expect(getDescendantIds(collections, 'a')).toEqual(new Set());
  });

  it('includes direct and multi-level descendants', () => {
    const collections = [
      makeCollection({ id: 'a', name: 'A' }),
      makeCollection({ id: 'b', name: 'B', parent: 'a' }),
      makeCollection({ id: 'c', name: 'C', parent: 'b' }),
      makeCollection({ id: 'sibling', name: 'Sibling' }),
    ];

    const descendants = getDescendantIds(collections, 'a');

    expect(descendants).toEqual(new Set(['b', 'c']));
    expect(descendants.has('sibling')).toBe(false);
  });
});
