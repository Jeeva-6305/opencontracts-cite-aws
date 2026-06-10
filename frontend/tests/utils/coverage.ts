import { test as baseTest } from "@playwright/experimental-ct-react";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Re-export everything from the original module so test files
// can import types like MountResult alongside test/expect.
export { expect, type MountResult } from "@playwright/experimental-ct-react";

const COVERAGE_DIR = path.resolve(__dirname, "../../coverage/ct/.nyc_output");

/**
 * Extended Playwright CT test fixture that collects Istanbul coverage
 * from the browser after each test. Enable by setting COVERAGE=true.
 *
 * Drop-in replacement for the @playwright/experimental-ct-react import.
 */
export const test = baseTest.extend({
  page: async ({ page }, use) => {
    await use(page);

    // Only collect coverage when COVERAGE env var is set
    if (!process.env.COVERAGE) return;

    try {
      // Extract Istanbul's __coverage__ object from the page
      const coverage = await page.evaluate(() => {
        return (window as unknown as { __coverage__?: unknown }).__coverage__;
      });

      if (coverage) {
        // Ensure output directory exists
        fs.mkdirSync(COVERAGE_DIR, { recursive: true });

        // Write coverage data with a unique filename
        const id = crypto.randomUUID();
        const filePath = path.join(COVERAGE_DIR, `coverage-${id}.json`);
        fs.writeFileSync(filePath, JSON.stringify(coverage));
      }
    } catch (err) {
      // Coverage collection is best-effort; do not fail the test
      console.warn("[coverage] failed to collect coverage data:", err);
    }
  },
});
