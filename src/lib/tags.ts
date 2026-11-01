/** Splits "Landscape, dark ,  minimal" into clean, lowercase, de-duplicated tags. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(',')) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (tag) seen.add(tag);
  }
  return [...seen];
}

/** Adds new tags to an existing list without duplicates, keeping order. */
export function mergeTags(current: string[], added: string[]): string[] {
  const seen = new Set(current);
  const next = [...current];
  for (const tag of added) {
    if (!seen.has(tag)) {
      seen.add(tag);
      next.push(tag);
    }
  }
  return next;
}
