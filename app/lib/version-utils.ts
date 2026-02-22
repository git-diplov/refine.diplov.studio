// ============================================================================
// Prompt Chronicle — Version Utility Functions
// ============================================================================
// Pure utility functions for the Prompt Chronicle versioning system.
// Zero-build CDN-based app — Vite transforms TS at dev/build time.
// No npm package imports. Browser-native APIs only.
// ============================================================================

import type { LibraryItem, DiffSegment } from './types';


// ----------------------------------------------------------------------------
// 1. getNextVersionNumber
// ----------------------------------------------------------------------------

/**
 * Given a parent's version string ("major.minor"), returns the next minor
 * version: "major.(minor+1)".
 *
 * @example
 *   getNextVersionNumber("1.0")  // => "1.1"
 *   getNextVersionNumber("2.3")  // => "2.4"
 *   getNextVersionNumber("")     // => "1.1"
 *   getNextVersionNumber("abc")  // => "1.1"
 */
export function getNextVersionNumber(parentVersionNumber: string): string {
  if (!parentVersionNumber || typeof parentVersionNumber !== 'string') {
    return '1.1';
  }

  const parts = parentVersionNumber.split('.');
  if (parts.length !== 2) return '1.1';

  const major = parseInt(parts[0], 10);
  const minor = parseInt(parts[1], 10);

  if (isNaN(major) || isNaN(minor)) return '1.1';

  return `${major}.${minor + 1}`;
}


// ----------------------------------------------------------------------------
// 2. getVersionChain
// ----------------------------------------------------------------------------

/**
 * Finds every item that belongs to the same version chain as `itemId`.
 *
 * A "version chain" is the set of items sharing the same `rootId`.
 * The root item itself is included (its own id equals the rootId).
 * Results are sorted chronologically by `createdAt` (oldest first).
 *
 * @example
 *   // Given items A(root), B(parentId=A, rootId=A), C(parentId=B, rootId=A)
 *   getVersionChain("B", library)  // => [A, B, C]  sorted by createdAt
 */
export function getVersionChain(
  itemId: string,
  library: LibraryItem[],
): LibraryItem[] {
  // Find the target item
  const target = library.find((item) => item.id === itemId);
  if (!target) return [];

  // Determine the root id for this chain.
  // If the item has a rootId, use it; otherwise the item itself is the root.
  const chainRootId = target.rootId || target.id;

  // Collect every item whose rootId matches, plus the root item itself
  const chain = library.filter(
    (item) => item.id === chainRootId || item.rootId === chainRootId,
  );

  // Sort chronologically by createdAt (oldest first)
  chain.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateA - dateB;
  });

  return chain;
}


// ----------------------------------------------------------------------------
// 3. computeLineDiff
// ----------------------------------------------------------------------------

/**
 * Computes a line-by-line diff between two texts using the LCS
 * (Longest Common Subsequence) algorithm.
 *
 * Returns an array of DiffSegment objects where each segment represents
 * one or more contiguous lines that are 'added', 'removed', or 'unchanged'.
 *
 * @example
 *   computeLineDiff("a\nb\nc", "a\nc\nd")
 *   // => [
 *   //   { type: 'unchanged', text: 'a\n' },
 *   //   { type: 'removed',   text: 'b\n' },
 *   //   { type: 'unchanged', text: 'c\n' },
 *   //   { type: 'added',     text: 'd' },
 *   // ]
 */
export function computeLineDiff(
  oldText: string,
  newText: string,
): DiffSegment[] {
  // Handle identical texts early
  if (oldText === newText) {
    if (oldText === '') return [];
    return [{ type: 'unchanged', text: oldText }];
  }

  // Split into lines, preserving line endings for accurate reconstruction
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);

  // Build the LCS table
  const m = oldLines.length;
  const n = newLines.length;

  // dp[i][j] = length of LCS of oldLines[0..i-1] and newLines[0..j-1]
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = new Array(n + 1).fill(0);
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce the diff operations
  const ops: Array<{ type: 'added' | 'removed' | 'unchanged'; line: string }> =
    [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push({ type: 'unchanged', line: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'added', line: newLines[j - 1] });
      j--;
    } else {
      ops.push({ type: 'removed', line: oldLines[i - 1] });
      i--;
    }
  }

  // Reverse because we built it backwards
  ops.reverse();

  // Merge consecutive operations of the same type into segments
  const segments: DiffSegment[] = [];
  for (const op of ops) {
    const last = segments[segments.length - 1];
    if (last && last.type === op.type) {
      last.text += op.line;
    } else {
      segments.push({ type: op.type, text: op.line });
    }
  }

  return segments;
}

/**
 * Splits text into lines while preserving line endings on each line.
 * The last line may or may not have a trailing newline depending on input.
 *
 * "a\nb\n" => ["a\n", "b\n"]
 * "a\nb"   => ["a\n", "b"]
 * ""       => []
 */
function splitLines(text: string): string[] {
  if (text === '') return [];

  const lines: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') {
      lines.push(text.slice(start, i + 1));
      start = i + 1;
    }
  }

  // Remaining text after the last newline (if no trailing newline)
  if (start < text.length) {
    lines.push(text.slice(start));
  }

  return lines;
}


// ----------------------------------------------------------------------------
// 4. computeSHA256
// ----------------------------------------------------------------------------

/**
 * Computes the SHA-256 hex digest of a string using the browser's
 * native `crypto.subtle` API.
 *
 * @example
 *   await computeSHA256("hello")
 *   // => "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
 */
export async function computeSHA256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}


// ----------------------------------------------------------------------------
// 5. repairChainAfterDeletion
// ----------------------------------------------------------------------------

/**
 * Re-links a version chain after an item is deleted from the middle.
 *
 * When an item is removed:
 *   1. Its direct children (items whose `parentId` === deleted item's id)
 *      are re-parented to the deleted item's own `parentId`.
 *   2. If the deleted item was the root of the chain (no parentId / it is
 *      the rootId), a new root is elected: the earliest child by `createdAt`.
 *      All chain members then have their `rootId` updated to the new root.
 *   3. The deleted item is removed from the returned array.
 *
 * Returns a **new** array (no mutation of the input).
 *
 * @example
 *   // Chain: A(root) -> B -> C
 *   // Deleting B re-parents C to A:
 *   repairChainAfterDeletion(B, library)
 *   // => library without B, C.parentId === A.id
 */
export function repairChainAfterDeletion(
  deletedItem: LibraryItem,
  library: LibraryItem[],
): LibraryItem[] {
  const deletedId = deletedItem.id;
  const deletedParentId = deletedItem.parentId ?? undefined;
  const chainRootId = deletedItem.rootId || deletedItem.id;

  // Determine if the deleted item is the root of the chain
  const isRoot = !deletedItem.parentId || deletedItem.id === chainRootId;

  // Create a shallow copy of items (excluding the deleted item),
  // cloning each object so we don't mutate the originals
  const result = library
    .filter((item) => item.id !== deletedId)
    .map((item) => ({ ...item }));

  // Find direct children of the deleted item
  const children = result.filter((item) => item.parentId === deletedId);

  // Re-parent children to the deleted item's parent
  for (const child of children) {
    child.parentId = deletedParentId;
  }

  // If the deleted item was the chain root, elect a new root
  if (isRoot && children.length > 0) {
    // Elect the earliest child as the new root
    const sortedChildren = [...children].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB;
    });
    const newRoot = sortedChildren[0];
    const newRootId = newRoot.id;

    // The new root no longer has a parent
    newRoot.parentId = undefined;
    newRoot.rootId = undefined;

    // Update all remaining chain members to point to the new root
    for (const item of result) {
      if (item.rootId === chainRootId && item.id !== newRootId) {
        item.rootId = newRootId;
      }
    }
  } else if (isRoot && children.length === 0) {
    // The deleted item was the root and had no children in the result set.
    // Any items still referencing this rootId need cleanup.
    // (Edge case: other chain members may exist with this rootId.)
    for (const item of result) {
      if (item.rootId === chainRootId) {
        // Each remaining item becomes its own root
        item.rootId = undefined;
        item.parentId = undefined;
      }
    }
  }

  return result;
}
