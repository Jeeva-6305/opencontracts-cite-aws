import React from "react";
import { test, expect } from "./utils/coverage";
import { ExtractCellFormatterTestWrapper } from "./ExtractCellFormatterTestWrapper";
import { docScreenshot } from "./utils/docScreenshot";

test.describe("ExtractCellFormatter", () => {
  test("renders string value with truncation", async ({ mount, page }) => {
    const component = await mount(
      <ExtractCellFormatterTestWrapper
        value="Hello world this is a test value"
        cellStatus={null}
        isExtractComplete={false}
      />
    );

    await expect(page.locator("text=Hello world")).toBeVisible({
      timeout: 5000,
    });

    await docScreenshot(page, "extracts--cell-formatter--string-value", {
      element: component,
    });

    await component.unmount();
  });

  test("renders JSON value with view/edit link", async ({ mount, page }) => {
    const component = await mount(
      <ExtractCellFormatterTestWrapper
        value={{ key: "value", nested: { a: 1 } }}
        cellStatus={null}
        isExtractComplete={false}
      />
    );

    await expect(page.locator("text=View/Edit JSON")).toBeVisible({
      timeout: 5000,
    });

    await docScreenshot(page, "extracts--cell-formatter--json-value", {
      element: component,
    });

    await component.unmount();
  });

  test("shows status dot when extract is complete", async ({ mount, page }) => {
    const component = await mount(
      <ExtractCellFormatterTestWrapper
        value="Approved value"
        cellStatus={{
          isApproved: true,
          isRejected: false,
          isEdited: false,
          isLoading: false,
          correctedData: null,
          originalData: "Approved value",
        }}
        isExtractComplete={true}
      />
    );

    await expect(page.locator("text=Approved value")).toBeVisible({
      timeout: 5000,
    });

    // Status dot is a styled-component with width/height 12px and border-radius 50%
    // Find it by its CSS properties
    const statusDots = page
      .locator("div")
      .filter({
        has: page.locator("text=Approved value"),
      })
      .locator("div");
    // The status dot is the one with cursor: pointer and small size
    let dotFound = false;
    const allDivs = await statusDots.all();
    for (const div of allDivs) {
      const cursor = await div.evaluate(
        (el) => window.getComputedStyle(el).cursor
      );
      const width = await div.evaluate(
        (el) => window.getComputedStyle(el).width
      );
      if (cursor === "pointer" && width === "12px") {
        dotFound = true;
        break;
      }
    }
    expect(dotFound).toBe(true);

    await docScreenshot(page, "extracts--cell-formatter--approved", {
      element: component,
    });

    await component.unmount();
  });

  test("shows loading indicator", async ({ mount, page }) => {
    const component = await mount(
      <ExtractCellFormatterTestWrapper
        value="Loading value"
        cellStatus={{
          isApproved: false,
          isRejected: false,
          isEdited: false,
          isLoading: true,
          correctedData: null,
          originalData: "Loading value",
        }}
        isExtractComplete={false}
      />
    );

    await expect(page.locator("text=Loading...")).toBeVisible({
      timeout: 5000,
    });

    await component.unmount();
  });

  test("shows corrected data when present", async ({ mount, page }) => {
    const component = await mount(
      <ExtractCellFormatterTestWrapper
        value="Original value"
        cellStatus={{
          isApproved: false,
          isRejected: false,
          isEdited: true,
          isLoading: false,
          correctedData: "Corrected value",
          originalData: "Original value",
        }}
        isExtractComplete={true}
      />
    );

    // Should show corrected data, not original
    await expect(page.locator("text=Corrected value")).toBeVisible({
      timeout: 5000,
    });

    await docScreenshot(page, "extracts--cell-formatter--edited", {
      element: component,
    });

    await component.unmount();
  });

  test("opens popup with action buttons on status dot click", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <ExtractCellFormatterTestWrapper
        value="Test value"
        cellStatus={{
          isApproved: false,
          isRejected: false,
          isEdited: false,
          isLoading: false,
          correctedData: null,
          originalData: "Test value",
        }}
        isExtractComplete={true}
      />
    );

    await expect(page.locator("text=Test value")).toBeVisible({
      timeout: 5000,
    });

    // Click the status dot to open popup - find by CSS properties
    const allDivs = await page.locator("div").all();
    for (const div of allDivs) {
      const cursor = await div.evaluate(
        (el) => window.getComputedStyle(el).cursor
      );
      const width = await div.evaluate(
        (el) => window.getComputedStyle(el).width
      );
      if (cursor === "pointer" && width === "12px") {
        await div.click();
        break;
      }
    }

    // Should show action buttons (Approve, Edit, Reject)
    await expect(page.locator("button[title='Approve']")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator("button[title='Edit']")).toBeVisible();
    await expect(page.locator("button[title='Reject']")).toBeVisible();

    await docScreenshot(page, "extracts--cell-formatter--action-popup", {
      element: component,
    });

    await component.unmount();
  });

  test("opens popup via keyboard and focuses first menu item", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <ExtractCellFormatterTestWrapper
        value="Keyboard test"
        cellStatus={{
          isApproved: false,
          isRejected: false,
          isEdited: false,
          isLoading: false,
          correctedData: null,
          originalData: "Keyboard test",
        }}
        isExtractComplete={true}
      />
    );

    await expect(page.locator("text=Keyboard test")).toBeVisible({
      timeout: 5000,
    });

    // Focus the status dot via its ARIA role
    const statusDot = page.locator(
      '[role="button"][aria-label="Cell status actions"]'
    );
    await expect(statusDot).toBeVisible({ timeout: 5000 });
    await statusDot.focus();

    // Open popup via Enter key
    await page.keyboard.press("Enter");

    // Verify popup opened and first menu item (Approve) is focused
    const approveButton = page.locator('button[aria-label="Approve"]');
    await expect(approveButton).toBeVisible({ timeout: 5000 });
    await expect(approveButton).toBeFocused({ timeout: 2000 });

    await component.unmount();
  });

  test("arrow keys navigate between menu items", async ({ mount, page }) => {
    // Provide cell with fullSourceList so View Sources button is enabled
    // and arrow key navigation can reach all four menu items
    const mockCell = {
      id: "test-cell-1",
      fullSourceList: [{ id: "ann-1" }],
    } as any;

    const component = await mount(
      <ExtractCellFormatterTestWrapper
        value="Arrow nav test"
        cellStatus={{
          isApproved: false,
          isRejected: false,
          isEdited: false,
          isLoading: false,
          correctedData: null,
          originalData: "Arrow nav test",
        }}
        isExtractComplete={true}
        cell={mockCell}
      />
    );

    await expect(page.locator("text=Arrow nav test")).toBeVisible({
      timeout: 5000,
    });

    // Open popup via keyboard
    const statusDot = page.locator(
      '[role="button"][aria-label="Cell status actions"]'
    );
    await statusDot.focus();
    await page.keyboard.press("Enter");

    // Wait for first item to be focused
    const approveButton = page.locator('button[aria-label="Approve"]');
    await expect(approveButton).toBeFocused({ timeout: 2000 });

    // Press ArrowDown to move to Edit
    await page.keyboard.press("ArrowDown");
    const editButton = page.locator('button[aria-label="Edit"]');
    await expect(editButton).toBeFocused({ timeout: 2000 });

    // Press ArrowDown to move to View Sources
    await page.keyboard.press("ArrowDown");
    const viewSourcesButton = page.locator('button[aria-label="View Sources"]');
    await expect(viewSourcesButton).toBeFocused({ timeout: 2000 });

    // Press ArrowDown to move to Reject
    await page.keyboard.press("ArrowDown");
    const rejectButton = page.locator('button[aria-label="Reject"]');
    await expect(rejectButton).toBeFocused({ timeout: 2000 });

    // Press ArrowDown again to wrap around to Approve
    await page.keyboard.press("ArrowDown");
    await expect(approveButton).toBeFocused({ timeout: 2000 });

    await component.unmount();
  });

  test("Escape key closes popup and returns focus to status dot", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <ExtractCellFormatterTestWrapper
        value="Escape test"
        cellStatus={{
          isApproved: false,
          isRejected: false,
          isEdited: false,
          isLoading: false,
          correctedData: null,
          originalData: "Escape test",
        }}
        isExtractComplete={true}
      />
    );

    await expect(page.locator("text=Escape test")).toBeVisible({
      timeout: 5000,
    });

    // Open popup via keyboard
    const statusDot = page.locator(
      '[role="button"][aria-label="Cell status actions"]'
    );
    await statusDot.focus();
    await page.keyboard.press("Enter");

    // Verify popup is open
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Press Escape to close
    await page.keyboard.press("Escape");

    // Popup should be hidden
    await expect(menu).not.toBeVisible({ timeout: 5000 });

    // Focus should return to the status dot
    await expect(statusDot).toBeFocused({ timeout: 2000 });

    await component.unmount();
  });
});
