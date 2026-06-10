/**
 * Dynamic Lucide icon resolver for the icon picker.
 *
 * Uses a wildcard import of lucide-react to resolve any kebab-case icon name
 * to its React component.  This import is scoped to the icon-picker feature
 * so that the bundle cost is only paid when the picker is actually loaded,
 * keeping the general-purpose iconCompat.ts lean.
 */

import { HelpCircle, type LucideIcon } from "lucide-react";
import * as AllLucideIcons from "lucide-react";

/** Cache resolved icons for O(1) repeat lookups. */
const cache = new Map<string, LucideIcon>();

/**
 * Convert a kebab-case Lucide icon name to its PascalCase export name.
 *
 * Examples:
 *  - "file-text"   → "FileText"
 *  - "bar-chart-2" → "BarChart2"
 *  - "x"           → "X"
 */
function kebabToPascal(name: string): string {
  return name
    .split("-")
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join("");
}

/**
 * Check whether a value looks like a Lucide icon component.
 *
 * Lucide icons created via `createLucideIcon` use `React.forwardRef`,
 * which returns an object (`typeof` → "object") rather than a plain
 * function.  We check for a `render` property (forwardRef signature)
 * or fall back to a function check for future-proofing.
 */
function isIconComponent(value: unknown): value is LucideIcon {
  if (typeof value === "function") return true;
  if (value && typeof value === "object" && "render" in value) return true;
  return false;
}

/**
 * Resolve a Lucide kebab-case icon name to its React component.
 *
 * Returns `HelpCircle` for any name that cannot be resolved.
 */
export function resolvePickerIcon(kebabName: string): LucideIcon {
  const cached = cache.get(kebabName);
  if (cached) return cached;

  const pascal = kebabToPascal(kebabName);
  const candidate = (AllLucideIcons as Record<string, unknown>)[pascal];
  if (isIconComponent(candidate)) {
    cache.set(kebabName, candidate);
    return candidate;
  }

  return HelpCircle;
}
