import React from "react";
import { test, expect } from "./utils/coverage";
import { AnnotationControlsTestWrapper } from "./AnnotationControlsTestWrapper";
import { docScreenshot } from "./utils/docScreenshot";

test.describe("AnnotationControls", () => {
  test("renders annotation controls with toggle switches", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <AnnotationControlsTestWrapper variant="sidebar" />
    );

    // Verify section header is visible in sidebar mode
    await expect(page.getByText("Visualization Settings")).toBeVisible({
      timeout: 10000,
    });

    // Verify toggle switches are present
    await expect(page.getByText("Show Only Selected")).toBeVisible();
    await expect(page.getByText("Show Bounding Boxes")).toBeVisible();
    await expect(page.getByText("Show Structural")).toBeVisible();
    await expect(page.getByText("Label Display")).toBeVisible();

    // Verify the label display dropdown is present
    const dropdown = page.locator(".oc-dropdown");
    await expect(dropdown.first()).toBeVisible();

    await docScreenshot(page, "annotator--annotation-controls--default");

    await component.unmount();
  });

  test("renders label display dropdown with default value", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <AnnotationControlsTestWrapper variant="sidebar" />
    );

    // The label display dropdown should be visible with its default value
    // Default value from reactive var is ALWAYS
    const dropdown = page.locator(".oc-dropdown").last();
    await expect(dropdown).toBeVisible({ timeout: 10000 });

    // The dropdown should show the current value
    await expect(dropdown.locator(".oc-dropdown__value")).toBeVisible();

    await component.unmount();
  });

  test("dropdown shows ALWAYS, ON_HOVER, and HIDE options", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <AnnotationControlsTestWrapper variant="sidebar" />
    );

    // Click the label display dropdown trigger to open it
    const dropdown = page.locator(".oc-dropdown").last();
    await dropdown.locator(".oc-dropdown__trigger").click();

    // Verify all three options are visible
    await expect(
      page.locator(".oc-dropdown__option", { hasText: "Always Show" })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator(".oc-dropdown__option", { hasText: "On Hover" })
    ).toBeVisible();
    await expect(
      page.locator(".oc-dropdown__option", { hasText: "Hide" })
    ).toBeVisible();

    await component.unmount();
  });

  test("renders in compact mode", async ({ mount, page }) => {
    const component = await mount(
      <AnnotationControlsTestWrapper variant="sidebar" compact />
    );

    // In compact mode, the section header is not rendered
    await expect(page.getByText("Visualization Settings")).not.toBeVisible();

    // But the controls themselves are still visible
    await expect(page.getByText("Show Only Selected")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("Show Bounding Boxes")).toBeVisible();
    await expect(page.getByText("Show Structural")).toBeVisible();

    await docScreenshot(page, "annotator--annotation-controls--compact");

    await component.unmount();
  });
});
