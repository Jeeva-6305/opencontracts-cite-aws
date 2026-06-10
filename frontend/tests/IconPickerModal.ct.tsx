import React from "react";
import { test, expect } from "./utils/coverage";
import { IconPickerModal } from "../src/components/widgets/icon-picker/IconPickerModal";
import { IconPickerModalInteractiveWrapper } from "./IconPickerModalTestWrapper";
import { docScreenshot } from "./utils/docScreenshot";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("IconPickerModal", () => {
  test("renders modal with search, categories, and icon grid", async ({
    mount,
    page,
  }) => {
    await mount(
      <IconPickerModal open={true} onSelect={() => {}} onClose={() => {}} />
    );

    // Modal visible
    const modal = page.getByTestId("icon-picker-modal");
    await expect(modal).toBeVisible();

    // Search input present
    const search = page.getByTestId("icon-picker-search");
    await expect(search).toBeVisible();

    // Category pills present
    const categories = page.getByTestId("icon-picker-categories");
    await expect(categories).toBeVisible();

    // Grid has icons
    const grid = page.getByTestId("icon-picker-grid");
    await expect(grid).toBeVisible();

    // Multiple icon cells rendered
    const cells = page.locator('[data-testid^="icon-cell-"]');
    const count = await cells.count();
    expect(count).toBeGreaterThan(50);

    await docScreenshot(page, "icons--picker-modal--default");
  });

  test("filters icons by search query", async ({ mount, page }) => {
    await mount(
      <IconPickerModal open={true} onSelect={() => {}} onClose={() => {}} />
    );

    const search = page.getByTestId("icon-picker-search");
    await search.fill("trash");

    // Should show trash-related icons
    await expect(page.getByTestId("icon-cell-trash")).toBeVisible();
    await expect(page.getByTestId("icon-cell-trash-2")).toBeVisible();

    // Should hide unrelated icons
    await expect(page.getByTestId("icon-cell-home")).not.toBeVisible();

    await docScreenshot(page, "icons--picker-modal--search-filtered");
  });

  test("filters icons by category", async ({ mount, page }) => {
    await mount(
      <IconPickerModal open={true} onSelect={() => {}} onClose={() => {}} />
    );

    // Click the "Files & Folders" category pill
    const filesPill = page
      .getByTestId("icon-picker-categories")
      .getByText("Files & Folders");
    await filesPill.click();

    // Should show file icons
    await expect(page.getByTestId("icon-cell-file")).toBeVisible();
    await expect(page.getByTestId("icon-cell-folder")).toBeVisible();

    // Should not show icons from other categories
    await expect(page.getByTestId("icon-cell-home")).not.toBeVisible();

    await docScreenshot(page, "icons--picker-modal--category-files");
  });

  test("shows empty state for no results", async ({ mount, page }) => {
    await mount(
      <IconPickerModal open={true} onSelect={() => {}} onClose={() => {}} />
    );

    const search = page.getByTestId("icon-picker-search");
    await search.fill("xyznonexistent");

    const empty = page.getByTestId("icon-picker-empty");
    await expect(empty).toBeVisible();
    await expect(empty).toContainText("xyznonexistent");

    await docScreenshot(page, "icons--picker-modal--empty-state");
  });

  test("highlights currently selected icon", async ({ mount, page }) => {
    await mount(
      <IconPickerModal
        open={true}
        value="star"
        onSelect={() => {}}
        onClose={() => {}}
      />
    );

    const starCell = page.getByTestId("icon-cell-star");
    await expect(starCell).toBeVisible();

    // Preview bar shows the selected icon name
    const preview = page.getByTestId("icon-picker-preview");
    await expect(preview).toContainText("star");

    await docScreenshot(page, "icons--picker-modal--selected");
  });

  test("selects an icon and closes modal", async ({ mount, page }) => {
    await mount(<IconPickerModalInteractiveWrapper />);

    // Click the "search" icon cell
    const searchCell = page.getByTestId("icon-cell-search");
    await searchCell.click();

    // Modal should be closed
    await expect(page.getByTestId("icon-picker-modal")).not.toBeVisible();

    // Selected value should be updated
    await expect(page.getByTestId("selected-value")).toHaveText("search");
  });

  test("closes via close button", async ({ mount, page }) => {
    await mount(<IconPickerModalInteractiveWrapper />);

    const closeBtn = page.getByTestId("icon-picker-close");
    await closeBtn.click();

    await expect(page.getByTestId("icon-picker-modal")).not.toBeVisible();
  });

  test("closes via backdrop click", async ({ mount, page }) => {
    await mount(<IconPickerModalInteractiveWrapper />);

    // Click the backdrop (outside the modal)
    const backdrop = page.getByTestId("icon-picker-backdrop");
    await backdrop.click({ position: { x: 5, y: 5 } });

    await expect(page.getByTestId("icon-picker-modal")).not.toBeVisible();
  });

  test("clears search with clear button", async ({ mount, page }) => {
    await mount(
      <IconPickerModal open={true} onSelect={() => {}} onClose={() => {}} />
    );

    const search = page.getByTestId("icon-picker-search");
    await search.fill("trash");

    // Clear button should appear
    const clearBtn = page.getByTestId("icon-picker-clear-search");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Search should be cleared and all icons restored
    await expect(search).toHaveValue("");
    const cells = page.locator('[data-testid^="icon-cell-"]');
    const count = await cells.count();
    expect(count).toBeGreaterThan(50);
  });

  test("preview bar shows hovered icon info", async ({ mount, page }) => {
    await mount(
      <IconPickerModal open={true} onSelect={() => {}} onClose={() => {}} />
    );

    // Hover over the "home" icon
    const homeCell = page.getByTestId("icon-cell-home");
    await homeCell.hover();

    const preview = page.getByTestId("icon-picker-preview");
    await expect(preview).toContainText("home");
    await expect(preview).toContainText("common");
  });

  test("does not render when open=false", async ({ mount, page }) => {
    await mount(
      <IconPickerModal open={false} onSelect={() => {}} onClose={() => {}} />
    );

    await expect(page.getByTestId("icon-picker-modal")).not.toBeVisible();
  });
});
