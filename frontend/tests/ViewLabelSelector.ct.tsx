import React from "react";
import { test, expect } from "./utils/coverage";
import { ViewLabelSelectorTestWrapper } from "./ViewLabelSelectorTestWrapper";
import { docScreenshot } from "./utils/docScreenshot";

test.describe("ViewLabelSelector", () => {
  test("renders multiselect dropdown", async ({ mount, page }) => {
    const component = await mount(<ViewLabelSelectorTestWrapper />);

    // The component renders a Dropdown with mode="multiselect"
    const dropdown = page.locator(".oc-dropdown");
    await expect(dropdown).toBeVisible({ timeout: 10000 });

    await component.unmount();
  });

  test("shows placeholder when no labels selected", async ({ mount, page }) => {
    const component = await mount(<ViewLabelSelectorTestWrapper />);

    // The dropdown should show the placeholder text when nothing is selected
    const placeholder = page.locator(".oc-dropdown__placeholder");
    await expect(placeholder).toBeVisible({ timeout: 10000 });
    await expect(placeholder).toHaveText("Only Show Labels");

    await docScreenshot(page, "annotator--view-label-selector--default");

    await component.unmount();
  });
});
