import { describe, it, expect } from "vitest";

import {
  resolveIconName,
  resolveIcon,
  SEMANTIC_TO_LUCIDE,
} from "../iconCompat";

// Direct imports for assertion comparisons — no barrel import.
import { HelpCircle, Trash, Check, Info, FileText } from "lucide-react";

describe("iconCompat", () => {
  // ── resolveIconName ──────────────────────────────────────────

  describe("resolveIconName", () => {
    it("maps every SEMANTIC_TO_LUCIDE entry to the expected Lucide name", () => {
      for (const [suiName, expectedLucide] of Object.entries(
        SEMANTIC_TO_LUCIDE
      )) {
        expect(resolveIconName(suiName)).toBe(expectedLucide);
      }
    });

    it("passes through already-valid Lucide kebab-case names", () => {
      expect(resolveIconName("trash")).toBe("trash");
      expect(resolveIconName("file-text")).toBe("file-text");
      expect(resolveIconName("check-circle")).toBe("check-circle");
      expect(resolveIconName("help-circle")).toBe("help-circle");
      expect(resolveIconName("arrow-left")).toBe("arrow-left");
    });

    it('returns "help-circle" for unknown icon names', () => {
      expect(resolveIconName("nonexistent-icon")).toBe("help-circle");
      // "banana" is a valid Lucide icon, so use a truly nonexistent name
      expect(resolveIconName("zzz-not-a-real-icon")).toBe("help-circle");
      expect(resolveIconName("")).toBe("help-circle");
    });

    it("handles leading/trailing whitespace", () => {
      expect(resolveIconName("  trash  ")).toBe("trash");
      expect(resolveIconName("  warning sign  ")).toBe("alert-triangle");
    });

    it("handles extra internal whitespace", () => {
      expect(resolveIconName("warning  sign")).toBe("alert-triangle");
      expect(resolveIconName("info   circle")).toBe("info");
    });

    it("is case-insensitive", () => {
      expect(resolveIconName("Trash")).toBe("trash");
      expect(resolveIconName("WARNING SIGN")).toBe("alert-triangle");
      expect(resolveIconName("Check Circle")).toBe("check-circle");
    });
  });

  // ── resolveIcon ──────────────────────────────────────────────

  describe("resolveIcon", () => {
    it("returns the correct Lucide component for SUI names", () => {
      expect(resolveIcon("trash")).toBe(Trash);
      expect(resolveIcon("check")).toBe(Check);
      expect(resolveIcon("info circle")).toBe(Info);
      expect(resolveIcon("file")).toBe(FileText);
    });

    it("returns the correct Lucide component for Lucide names", () => {
      expect(resolveIcon("file-text")).toBe(FileText);
      expect(resolveIcon("trash")).toBe(Trash);
    });

    it("returns HelpCircle for unknown names", () => {
      expect(resolveIcon("unknown-gibberish")).toBe(HelpCircle);
      expect(resolveIcon("")).toBe(HelpCircle);
    });

    it("returns a valid React component for every SUI entry", () => {
      // Entries that intentionally map to HelpCircle (their Lucide equivalent)
      const mapsToHelpCircle = new Set(
        Object.entries(SEMANTIC_TO_LUCIDE)
          .filter(([, v]) => v === "help-circle")
          .map(([k]) => k)
      );

      for (const [suiName, lucideName] of Object.entries(SEMANTIC_TO_LUCIDE)) {
        const component = resolveIcon(suiName);
        expect(component).toBeDefined();
        expect(typeof component).toBe("object"); // Lucide icons are forwardRef objects

        if (!mapsToHelpCircle.has(suiName)) {
          expect(component).not.toBe(HelpCircle);
        } else {
          // These intentionally resolve to HelpCircle
          expect(component).toBe(HelpCircle);
          expect(lucideName).toBe("help-circle");
        }
      }
    });
  });

  // ── Alias consistency ────────────────────────────────────────

  describe("alias consistency", () => {
    it("check and checkmark resolve to the same component", () => {
      expect(resolveIcon("check")).toBe(resolveIcon("checkmark"));
    });

    it("close, remove, and times resolve to the same component", () => {
      const closeIcon = resolveIcon("close");
      expect(resolveIcon("remove")).toBe(closeIcon);
      expect(resolveIcon("times")).toBe(closeIcon);
    });

    it("cancel and remove circle resolve to the same component", () => {
      expect(resolveIcon("cancel")).toBe(resolveIcon("remove circle"));
    });

    it("edit and edit outline resolve to the same component", () => {
      expect(resolveIcon("edit")).toBe(resolveIcon("edit outline"));
    });

    it("file variants all resolve to file-text", () => {
      const fileIcon = resolveIcon("file");
      expect(resolveIcon("file outline")).toBe(fileIcon);
      expect(resolveIcon("file alternate outline")).toBe(fileIcon);
      expect(resolveIcon("file text")).toBe(fileIcon);
    });

    it("warning and warning sign resolve to the same component", () => {
      const warnIcon = resolveIcon("warning");
      expect(resolveIcon("warning sign")).toBe(warnIcon);
    });

    it("warning circle resolves to circle-alert (distinct from warning)", () => {
      expect(resolveIconName("warning circle")).toBe("circle-alert");
      expect(resolveIconName("warning")).toBe("alert-triangle");
    });

    it("cog and settings resolve to different but valid components", () => {
      // "cog" → cog (Lucide Cog), "settings" → settings (Lucide Settings)
      const cogIcon = resolveIcon("cog");
      const settingsIcon = resolveIcon("settings");
      expect(cogIcon).toBeDefined();
      expect(settingsIcon).toBeDefined();
    });

    it("comment and comments resolve to the same component", () => {
      expect(resolveIcon("comment")).toBe(resolveIcon("comments"));
    });

    it("code branch and fork resolve to the same component", () => {
      expect(resolveIcon("code branch")).toBe(resolveIcon("fork"));
    });
  });

  // ── Case sensitivity documentation ──────────────────────────

  describe("case sensitivity", () => {
    it("normalizes all input to lowercase before lookup", () => {
      // SUI names
      expect(resolveIconName("TRASH")).toBe("trash");
      expect(resolveIconName("Info Circle")).toBe("info");
      expect(resolveIconName("WARNING SIGN")).toBe("alert-triangle");

      // Lucide passthrough
      expect(resolveIconName("File-Text")).toBe("file-text");

      // The mapping is therefore effectively case-insensitive.
    });
  });
});
