/**
 * Array utility functions for common operations.
 */

/**
 * Compares two string arrays for equality, ignoring order.
 * Returns true if both arrays contain the same elements.
 *
 * @param a - First array
 * @param b - Second array
 * @returns true if arrays contain the same elements
 */
export function arraysEqualUnordered(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Compares two string arrays for equality, considering order.
 * Returns true if both arrays have the same elements in the same order.
 *
 * @param a - First array
 * @param b - Second array
 * @returns true if arrays are identical
 */
export function arraysEqualOrdered(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((val, idx) => val === b[idx]);
}
