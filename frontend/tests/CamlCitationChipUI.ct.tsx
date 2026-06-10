/**
 * Playwright component tests for CamlCitationChip, CamlCitationLoading,
 * and CamlCitationError.
 *
 * Tests cover:
 * 1. Chip renders with label text and correct styling
 * 2. Popover appears on hover with snippet, doc title, score, deep link
 * 3. Loading state renders pulsing placeholder
 * 4. Error state renders visible error chip
 * 5. Accessibility: aria-label on chip button
 */
import { test, expect } from "./utils/coverage";
import { docScreenshot } from "./utils/docScreenshot";
import { CamlCitationChipTestWrapper } from "./CamlCitationChipTestWrapper";
import {
  MOCK_CITATION,
  MOCK_CITATION_NO_LABEL,
} from "./CamlCitationChipFixtures";

test.describe("CamlCitationChip - Default State", () => {
  test("should render chip with label text", async ({ mount, page }) => {
    const component = await mount(<CamlCitationChipTestWrapper />);

    const chip = page.getByRole("button", {
      name: `Citation: ${MOCK_CITATION.labelText}`,
    });
    await expect(chip).toBeVisible({ timeout: 5000 });
    await expect(chip).toHaveText(MOCK_CITATION.labelText);

    await docScreenshot(page, "caml--citation-chip--default");

    await component.unmount();
  });

  test("should show fallback label when labelText is empty", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <CamlCitationChipTestWrapper citation={MOCK_CITATION_NO_LABEL} />
    );

    const chip = page.getByRole("button", { name: "Citation: Citation" });
    await expect(chip).toBeVisible({ timeout: 5000 });
    await expect(chip).toHaveText("Citation");

    await component.unmount();
  });
});

test.describe("CamlCitationChip - Popover", () => {
  test("should show popover with details on hover", async ({ mount, page }) => {
    const component = await mount(<CamlCitationChipTestWrapper />);

    const chip = page.getByRole("button", {
      name: `Citation: ${MOCK_CITATION.labelText}`,
    });
    await expect(chip).toBeVisible({ timeout: 5000 });

    // Hover to trigger popover
    await chip.hover();
    await page.waitForTimeout(300);

    // Popover should show annotation text snippet
    await expect(
      page.getByText("Force majeure clauses were updated")
    ).toBeVisible({ timeout: 3000 });

    // Document title
    await expect(page.getByText(MOCK_CITATION.documentTitle)).toBeVisible();

    // Similarity score (91%)
    await expect(page.getByText("91% match")).toBeVisible();

    // Page number
    await expect(page.getByText("p.12")).toBeVisible();

    // Deep link
    await expect(page.getByText("View in document")).toBeVisible();

    await docScreenshot(page, "caml--citation-chip--popover");

    await component.unmount();
  });
});

test.describe("CamlCitationChip - Loading State", () => {
  test("should render pulsing loading placeholder", async ({ mount, page }) => {
    const component = await mount(
      <CamlCitationChipTestWrapper variant="loading" />
    );

    await expect(page.getByText("finding citation")).toBeVisible({
      timeout: 5000,
    });

    await docScreenshot(page, "caml--citation-chip--loading");

    await component.unmount();
  });
});

test.describe("CamlCitationChip - Error State", () => {
  test("should render error chip with message", async ({ mount, page }) => {
    const component = await mount(
      <CamlCitationChipTestWrapper
        variant="error"
        errorMessage="Network error: failed to fetch"
      />
    );

    const errorChip = page.getByText("citation failed");
    await expect(errorChip).toBeVisible({ timeout: 5000 });

    // Tooltip should contain the error message
    await expect(errorChip).toHaveAttribute(
      "title",
      "Network error: failed to fetch"
    );

    await docScreenshot(page, "caml--citation-chip--error");

    await component.unmount();
  });
});
