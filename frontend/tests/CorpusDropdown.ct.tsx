import React from "react";
import { test, expect } from "./utils/coverage";
import { CorpusDropdownTestWrapper } from "./CorpusDropdownTestWrapper";
import { docScreenshot } from "./utils/docScreenshot";

test.describe("CorpusDropdown", () => {
  test("renders with default placeholder", async ({ mount, page }) => {
    const component = await mount(<CorpusDropdownTestWrapper />);

    // Should show the dropdown with the default placeholder
    const placeholder = page.locator(".oc-dropdown__placeholder");
    await expect(placeholder).toBeVisible({ timeout: 10000 });
    await expect(placeholder).toContainText("Select Corpus");

    await docScreenshot(page, "widgets--corpus-dropdown--default");

    await component.unmount();
  });

  test("renders with custom placeholder", async ({ mount, page }) => {
    const component = await mount(
      <CorpusDropdownTestWrapper placeholder="Pick a corpus..." />
    );

    const placeholder = page.locator(".oc-dropdown__placeholder");
    await expect(placeholder).toBeVisible({ timeout: 10000 });
    await expect(placeholder).toContainText("Pick a corpus...");

    await component.unmount();
  });

  test("shows corpus options when data loads", async ({ mount, page }) => {
    const component = await mount(<CorpusDropdownTestWrapper />);

    // Wait for dropdown to be ready
    const trigger = page.locator(".oc-dropdown__trigger");
    await expect(trigger).toBeVisible({ timeout: 10000 });

    // Open the dropdown
    await trigger.click();

    // The dropdown menu should appear with options
    const menu = page.locator(".oc-dropdown__menu");
    await expect(menu).toBeVisible({ timeout: 10000 });

    const options = page.locator(".oc-dropdown__option");
    await expect(options).toHaveCount(2, { timeout: 10000 });
    await expect(options.first()).toContainText("Test Corpus");
    await expect(options.last()).toContainText("Another Corpus");

    await docScreenshot(page, "widgets--corpus-dropdown--with-options");

    await component.unmount();
  });

  test("selects a corpus when clicked", async ({ mount, page }) => {
    const component = await mount(<CorpusDropdownTestWrapper />);

    // Open the dropdown
    const trigger = page.locator(".oc-dropdown__trigger");
    await expect(trigger).toBeVisible({ timeout: 10000 });
    await trigger.click();

    // Click the first option
    const options = page.locator(".oc-dropdown__option");
    await expect(options.first()).toBeVisible({ timeout: 10000 });
    await options.first().click();

    // The selected value should now show
    const selectedValue = page.locator(".oc-dropdown__value");
    await expect(selectedValue).toBeVisible({ timeout: 10000 });
    await expect(selectedValue).toContainText("Test Corpus");

    // Hidden test element should reflect the selection
    const hiddenValue = page.locator('[data-testid="selected-corpus"]');
    await expect(hiddenValue).toHaveText("corpus-1", { timeout: 10000 });

    await component.unmount();
  });
});
