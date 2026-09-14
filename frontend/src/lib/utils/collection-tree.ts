import type { Collection } from '@/types/collections';

export interface CollectionTreeNode {
  collection: Collection;
  children: CollectionTreeNode[];
}

/** Builds a folder tree from the flat, `parent`-pointer list the API returns. */
export function buildCollectionTree(collections: Collection[]): CollectionTreeNode[] {
  const byParent = new Map<string | null, Collection[]>();
  for (const collection of collections) {
    const key = collection.parent;
    const siblings = byParent.get(key);
    if (siblings) siblings.push(collection);
    else byParent.set(key, [collection]);
  }

  function build(parentId: string | null): CollectionTreeNode[] {
    return (byParent.get(parentId) ?? []).map((collection) => ({
      collection,
      children: build(collection.id),
    }));
  }

  return build(null);
}

/** "Grandparent / Parent / Child" labels, for pickers where duplicate names could otherwise be ambiguous. */
export function buildCollectionPathLabels(collections: Collection[]): Map<string, string> {
  const byId = new Map(collections.map((c) => [c.id, c]));
  const labels = new Map<string, string>();

  function pathFor(collection: Collection): string {
    const cached = labels.get(collection.id);
    if (cached) return cached;
    const parent = collection.parent ? byId.get(collection.parent) : undefined;
    const label = parent ? `${pathFor(parent)} / ${collection.name}` : collection.name;
    labels.set(collection.id, label);
    return label;
  }

  for (const collection of collections) pathFor(collection);
  return labels;
}

/** Every id reachable by following `children` from `id` — mirrors the backend's cycle check, for filtering move-target pickers client-side. */
export function getDescendantIds(collections: Collection[], id: string): Set<string> {
  const childIds = new Map<string, string[]>();
  for (const collection of collections) {
    if (!collection.parent) continue;
    const siblings = childIds.get(collection.parent);
    if (siblings) siblings.push(collection.id);
    else childIds.set(collection.parent, [collection.id]);
  }

  const descendants = new Set<string>();
  const stack = [...(childIds.get(id) ?? [])];
  while (stack.length > 0) {
    const next = stack.pop() as string;
    if (!descendants.has(next)) {
      descendants.add(next);
      stack.push(...(childIds.get(next) ?? []));
    }
  }
  return descendants;
}
