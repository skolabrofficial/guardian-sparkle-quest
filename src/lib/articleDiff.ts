/** Compute a small diff snippet: a few words of context, the changed old chunk,
 *  the changed new chunk, and a few words after. Character-level common prefix/suffix. */
export function computeDiffSnippet(oldStr: string, newStr: string, context = 40) {
  const a = oldStr ?? '';
  const b = newStr ?? '';
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let sa = a.length, sb = b.length;
  while (sa > p && sb > p && a[sa - 1] === b[sb - 1]) { sa--; sb--; }
  const before = a.slice(Math.max(0, p - context), p);
  const after  = a.slice(sa, Math.min(a.length, sa + context));
  const oldChunk = a.slice(p, sa);
  const newChunk = b.slice(p, sb);
  return {
    diff_before: before,
    diff_old: oldChunk,
    diff_new: newChunk,
    diff_after: after,
  };
}
