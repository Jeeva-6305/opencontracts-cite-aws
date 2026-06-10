import React from "react";
import { test, expect } from "./utils/coverage";
import { MetadataColumnModal } from "../src/components/widgets/modals/MetadataColumnModal";
import { docScreenshot } from "./utils/docScreenshot";

test.describe("MetadataColumnModal", () => {
  test("renders create mode when open with no column", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <MetadataColumnModal open={true} onClose={() => {}} onSave={() => {}} />
    );

    // Modal renders via portal, check page
    await expect(page.getByText("Create Metadata Field")).toBeVisible({
      timeout: 5000,
    });

    // Check form fields are present
    await expect(page.getByText("Field Name")).toBeVisible();
    await expect(page.getByText("Data Type")).toBeVisible();
    await expect(page.getByText("Help Text")).toBeVisible();
    await expect(page.getByText("Validation Rules")).toBeVisible();

    // Check buttons
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Field" })
    ).toBeVisible();

    await docScreenshot(page, "metadata--column-modal--initial");

    await component.unmount();
  });

  test("does not render when open is false", async ({ mount, page }) => {
    const component = await mount(
      <MetadataColumnModal open={false} onClose={() => {}} onSave={() => {}} />
    );

    await expect(page.getByText("Create Metadata Field")).not.toBeVisible();

    await component.unmount();
  });

  test("renders edit mode when column is provided", async ({ mount, page }) => {
    const existingColumn = {
      id: "col-1",
      name: "Contract Status",
      dataType: "STRING" as const,
      helpText: "Current status of the contract",
      isManualEntry: true,
    };

    const component = await mount(
      <MetadataColumnModal
        open={true}
        onClose={() => {}}
        onSave={() => {}}
        column={existingColumn}
      />
    );

    // Should show "Edit" title instead of "Create"
    await expect(page.getByText("Edit Metadata Field")).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.getByRole("button", { name: "Update Field" })
    ).toBeVisible();

    await component.unmount();
  });

  test("calls onClose when Cancel is clicked", async ({ mount, page }) => {
    let closed = false;

    const component = await mount(
      <MetadataColumnModal
        open={true}
        onClose={() => {
          closed = true;
        }}
        onSave={() => {}}
      />
    );

    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole("button", { name: "Cancel" }).click();

    expect(closed).toBe(true);

    await component.unmount();
  });

  test("shows validation error when saving without a name", async ({
    mount,
    page,
  }) => {
    let saveCalled = false;

    const component = await mount(
      <MetadataColumnModal
        open={true}
        onClose={() => {}}
        onSave={() => {
          saveCalled = true;
        }}
      />
    );

    await expect(
      page.getByRole("button", { name: "Create Field" })
    ).toBeVisible({ timeout: 5000 });

    // Click save without entering a name
    await page.getByRole("button", { name: "Create Field" }).click();

    // Should show validation error
    await expect(page.getByText("Field name is required")).toBeVisible();

    // onSave should not have been called
    expect(saveCalled).toBe(false);

    await component.unmount();
  });

  test("has required field checkbox in validation rules", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <MetadataColumnModal open={true} onClose={() => {}} onSave={() => {}} />
    );

    await expect(page.getByText("Required Field")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator("#metadata-required")).toBeVisible();

    await component.unmount();
  });
});
