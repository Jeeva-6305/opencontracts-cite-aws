// Playwright Component Test for RadialButtonCloud
// Tests the pulsing dot, radial button expansion, and confirmation modal.
import React from "react";
import { test, expect } from "./utils/coverage";
import type { CloudButtonItem } from "../src/components/widgets/buttons/RadialButtonCloud";
import { RadialButtonCloudWrapper } from "./utils/RadialButtonCloudWrapper";
import { docScreenshot } from "./utils/docScreenshot";

const sampleActions: CloudButtonItem[] = [
  {
    name: "trash",
    color: "#e74c3c",
    tooltip: "Delete",
    onClick: () => {},
  },
  {
    name: "edit",
    color: "#3498db",
    tooltip: "Edit",
    onClick: () => {},
  },
  {
    name: "copy",
    color: "#2ecc71",
    tooltip: "Copy",
    onClick: () => {},
  },
];

const protectedActions: CloudButtonItem[] = [
  {
    name: "trash",
    color: "#e74c3c",
    tooltip: "Delete",
    protected_message: "Are you sure you want to delete this item?",
    onClick: () => {},
  },
  {
    name: "edit",
    color: "#3498db",
    tooltip: "Edit",
    onClick: () => {},
  },
];

test.describe("RadialButtonCloud", () => {
  test("renders pulsing dot in collapsed state", async ({ mount, page }) => {
    const component = await mount(
      <RadialButtonCloudWrapper actions={sampleActions} />
    );

    // The pulsing dot should be visible
    const dot = page.locator(".pulsing-dot");
    await expect(dot).toBeVisible();

    await docScreenshot(page, "widgets--radial-button-cloud--collapsed");

    await component.unmount();
  });

  test("expands cloud on hover showing action buttons", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <RadialButtonCloudWrapper actions={sampleActions} />
    );

    // Hover over the pulsing dot to expand the cloud
    const dot = page.locator(".pulsing-dot");
    await dot.hover();

    // Wait for the cloud buttons to appear
    await page.waitForTimeout(500);

    // Action buttons should now be visible (one for each action)
    const buttons = page.locator("button[title]");
    await expect(buttons).toHaveCount(3);

    await docScreenshot(page, "widgets--radial-button-cloud--expanded");

    await component.unmount();
  });

  test("shows confirmation modal for protected actions", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <RadialButtonCloudWrapper actions={protectedActions} />
    );

    // Hover to expand
    const dot = page.locator(".pulsing-dot");
    await dot.hover();
    await page.waitForTimeout(500);

    // Click the protected action (trash button)
    const deleteButton = page.locator('button[title="Delete"]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Confirmation modal should appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(
      page.getByText("Are you sure you want to delete this item?")
    ).toBeVisible();

    // Should have Yes/No buttons
    await expect(page.getByRole("button", { name: "Yes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "No" })).toBeVisible();

    await docScreenshot(
      page,
      "widgets--radial-button-cloud--confirmation-modal"
    );

    await component.unmount();
  });

  test("dismisses confirmation modal on No click", async ({ mount, page }) => {
    const component = await mount(
      <RadialButtonCloudWrapper actions={protectedActions} />
    );

    // Expand and click protected action
    const dot = page.locator(".pulsing-dot");
    await dot.hover();
    await page.waitForTimeout(500);
    await page.locator('button[title="Delete"]').click();

    // Wait for modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click No
    await page.getByRole("button", { name: "No" }).click();

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    await component.unmount();
  });
});
