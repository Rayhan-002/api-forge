/**
 * Dotted-path lookup mirroring apps.saved_requests.extraction.extract_json_value
 * on the backend: "token", "data.access_token", "items.0.id". Used for the
 * client-side preview when creating an extraction rule — the backend
 * re-does this itself on every actual execution, this is just so the user
 * gets immediate feedback that the path resolves to something.
 */
export class PathNotFoundError extends Error {}

export function extractJsonValue(data: unknown, path: string): unknown {
  let current = data;
  for (const segment of path.split('.')) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        throw new PathNotFoundError(`'${segment}' not found.`);
      }
      current = current[index];
    } else if (current !== null && typeof current === 'object') {
      if (!(segment in current)) {
        throw new PathNotFoundError(`'${segment}' not found.`);
      }
      current = (current as Record<string, unknown>)[segment];
    } else {
      throw new PathNotFoundError(`Cannot look up '${segment}' on a ${typeof current}.`);
    }
  }
  return current;
}
