import React from "react";
import { test, expect } from "./utils/coverage";
import { IconDropdownInteractiveWrapper } from "./IconDropdownTestWrapper";
import { docScreenshot } from "./utils/docScreenshot";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("IconDropdown", () => {
  test("renders trigger with placeholder when no value", async ({
    mount,
    page,
  }) => {
    await mount(<IconDropdownInteractiveWrapper />);

    const trigger = page.getByTestId("icon-dropdown-trigger");
    await expect(trigger).toBeVisible();
    await expect(trigger).toContainText("Choose icon");

    await docScreenshot(page, "icons--dropdown--placeholder");
  });

  test("renders trigger with selected icon name", async ({ mount, page }) => {
    await mount(<IconDropdownInteractiveWrapper initialValue="star" />);

    const trigger = page.getByTestId("icon-dropdown-trigger");
    await expect(trigger).toContainText("star");

    // Should render SVG icons (selected icon + chevron)
    const svgs = trigger.locator("svg");
    await expect(svgs).toHaveCount(2);

    await docScreenshot(page, "icons--dropdown--with-value");
  });

  test("opens modal on click and selects icon", async ({ mount, page }) => {
    await mount(<IconDropdownInteractiveWrapper />);

    // Open modal
    const trigger = page.getByTestId("icon-dropdown-trigger");
    await trigger.click();

    // Modal should be visible
    await expect(page.getByTestId("icon-picker-modal")).toBeVisible();

    // Select an icon
    await page.getByTestId("icon-cell-heart").click();

    // Modal should close
    await expect(page.getByTestId("icon-picker-modal")).not.toBeVisible();

    // Value should be updated
    await expect(page.getByTestId("current-value")).toHaveText("heart");

    // Trigger should now show the selected icon
    await expect(trigger).toContainText("heart");
  });

  test("disabled state prevents opening modal", async ({ mount, page }) => {
    await mount(<IconDropdownInteractiveWrapper disabled />);

    const trigger = page.getByTestId("icon-dropdown-trigger");
    await expect(trigger).toBeDisabled();

    await docScreenshot(page, "icons--dropdown--disabled");
  });

  test("full workflow: open, search, select, verify", async ({
    mount,
    page,
  }) => {
    await mount(<IconDropdownInteractiveWrapper initialValue="folder" />);

    // Open modal
    await page.getByTestId("icon-dropdown-trigger").click();
    await expect(page.getByTestId("icon-picker-modal")).toBeVisible();

    // Search for "rocket"
    await page.getByTestId("icon-picker-search").fill("rocket");
    await expect(page.getByTestId("icon-cell-rocket")).toBeVisible();

    // Select rocket
    await page.getByTestId("icon-cell-rocket").click();

    // Verify selection
    await expect(page.getByTestId("current-value")).toHaveText("rocket");
    await expect(page.getByTestId("icon-dropdown-trigger")).toContainText(
      "rocket"
    );
  });
});
