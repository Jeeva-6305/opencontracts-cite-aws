import React from "react";
import { test, expect } from "./utils/coverage";
import { docScreenshot } from "./utils/docScreenshot";
import { CreateColumnModalTestWrapper } from "./CreateColumnModalTestWrapper";

test.describe("CreateColumnModal - Rendering", () => {
  test("should render modal with all sections visible", async ({
    mount,
    page,
  }) => {
    await mount(<CreateColumnModalTestWrapper />);

    // Wait for modal to appear (has 50ms mount delay)
    await expect(page.locator("text=Create New Column")).toBeVisible({
      timeout: 5000,
    });

    // Verify subtitle
    await expect(
      page.locator(
        "text=Configure an extraction column to pull structured data"
      )
    ).toBeVisible();

    // Verify all section headers
    await expect(page.locator("text=Basic Configuration")).toBeVisible();
    await expect(page.locator("text=Output Type")).toBeVisible();
    await expect(page.locator("text=Extraction Configuration")).toBeVisible();
    await expect(page.locator("text=Advanced Options")).toBeVisible();

    // Verify footer
    await expect(
      page.locator("text=All required fields must be filled")
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Column" })
    ).toBeVisible();

    await docScreenshot(page, "extracts--create-column-modal--default");
  });

  test("should render form fields with correct placeholders", async ({
    mount,
    page,
  }) => {
    await mount(<CreateColumnModalTestWrapper />);

    await expect(page.locator("text=Create New Column")).toBeVisible({
      timeout: 5000,
    });

    // Basic config fields
    await expect(
      page.locator('input[placeholder="Enter column name"]')
    ).toBeVisible();

    // Extraction config fields
    await expect(
      page.locator(
        'textarea[placeholder="What query shall we use to guide the LLM extraction?"]'
      )
    ).toBeVisible();
    await expect(
      page.locator(
        'textarea[placeholder*="Only look in annotations that contain"]'
      )
    ).toBeVisible();
    await expect(
      page.locator(
        'textarea[placeholder="Place example of text containing relevant data here"]'
      )
    ).toBeVisible();

    // Advanced options fields
    await expect(
      page.locator(
        'textarea[placeholder*="Provide detailed instructions for extracting"]'
      )
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="Enter label name"]')
    ).toBeVisible();
  });
});

test.describe("CreateColumnModal - Output Type", () => {
  test("should default to Primitive Type with String selected", async ({
    mount,
    page,
  }) => {
    await mount(<CreateColumnModalTestWrapper />);

    await expect(page.locator("text=Create New Column")).toBeVisible({
      timeout: 5000,
    });

    // Primitive Type radio should be checked
    const primitiveRadio = page.locator('input[value="primitive"]');
    await expect(primitiveRadio).toBeChecked();

    // Custom Model radio should not be checked
    const customRadio = page.locator('input[value="custom"]');
    await expect(customRadio).not.toBeChecked();

    // Primitive type dropdown should show "String"
    await expect(
      page.locator(".oc-dropdown__value").filter({ hasText: "String" })
    ).toBeVisible();
  });

  test("should switch to Custom Model and show ModelFieldBuilder", async ({
    mount,
    page,
  }) => {
    await mount(<CreateColumnModalTestWrapper />);

    await expect(page.locator("text=Create New Column")).toBeVisible({
      timeout: 5000,
    });

    // Click Custom Model radio
    await page.locator("text=Custom Model").click();

    // Custom radio should now be checked
    const customRadio = page.locator('input[value="custom"]');
    await expect(customRadio).toBeChecked();

    // ModelFieldBuilder should appear with "Add Field" button
    await expect(page.locator("text=Add Field")).toBeVisible();

    // Primitive type dropdown should not be visible
    await expect(
      page.locator(".oc-dropdown__value").filter({ hasText: "String" })
    ).toBeHidden();

    await docScreenshot(page, "extracts--create-column-modal--custom-model");
  });

  test("should toggle List of Values checkbox", async ({ mount, page }) => {
    await mount(<CreateColumnModalTestWrapper />);

    await expect(page.locator("text=Create New Column")).toBeVisible({
      timeout: 5000,
    });

    // List checkbox should be unchecked initially
    const listCheckbox = page
      .locator("label")
      .filter({ hasText: "List of Values" })
      .locator('input[type="checkbox"]');
    await expect(listCheckbox).not.toBeChecked();

    // Click the checkbox
    await page.locator("text=List of Values").click();
    await expect(listCheckbox).toBeChecked();
  });
});

test.describe("CreateColumnModal - Form Interaction", () => {
  test("should fill in form fields", async ({ mount, page }) => {
    await mount(<CreateColumnModalTestWrapper />);

    await expect(page.locator("text=Create New Column")).toBeVisible({
      timeout: 5000,
    });

    // Fill name
    const nameInput = page.locator('input[placeholder="Enter column name"]');
    await nameInput.fill("Contract Amount");
    await expect(nameInput).toHaveValue("Contract Amount");

    // Fill query
    const queryInput = page.locator(
      'textarea[placeholder="What query shall we use to guide the LLM extraction?"]'
    );
    await queryInput.fill("What is the total contract amount?");
    await expect(queryInput).toHaveValue("What is the total contract amount?");

    // Fill must contain text
    const mustContainInput = page.locator(
      'textarea[placeholder*="Only look in annotations that contain"]'
    );
    await mustContainInput.fill("amount");

    // Fill parser instructions
    const instructionsInput = page.locator(
      'textarea[placeholder*="Provide detailed instructions for extracting"]'
    );
    await instructionsInput.fill(
      "Extract the monetary value including currency"
    );

    await docScreenshot(page, "extracts--create-column-modal--filled");
  });

  test("should disable Create Column button when required fields are empty", async ({
    mount,
    page,
  }) => {
    await mount(<CreateColumnModalTestWrapper />);

    await expect(page.locator("text=Create New Column")).toBeVisible({
      timeout: 5000,
    });

    // Create button should be disabled initially (name and query are empty)
    const createButton = page.getByRole("button", { name: "Create Column" });
    await expect(createButton).toBeDisabled();
  });

  test("should enable Create Column button when required fields are filled", async ({
    mount,
    page,
  }) => {
    await mount(<CreateColumnModalTestWrapper />);

    await expect(page.locator("text=Create New Column")).toBeVisible({
      timeout: 5000,
    });

    // Fill required fields
    await page
      .locator('input[placeholder="Enter column name"]')
      .fill("Test Column");
    await page
      .locator(
        'textarea[placeholder="What query shall we use to guide the LLM extraction?"]'
      )
      .fill("Test query");

    // Create button should now be enabled (taskName has a default value)
    const createButton = page.getByRole("button", { name: "Create Column" });
    await expect(createButton).toBeEnabled();
  });
});

test.describe("CreateColumnModal - Close Behavior", () => {
  test("should close on Cancel button click", async ({ mount, page }) => {
    await mount(<CreateColumnModalTestWrapper />);

    await expect(page.locator("text=Create New Column")).toBeVisible({
      timeout: 5000,
    });

    // Click cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Modal should be gone
    await expect(page.locator("text=Create New Column")).toBeHidden();
  });

  test("should close on X button click", async ({ mount, page }) => {
    await mount(<CreateColumnModalTestWrapper />);

    await expect(page.locator("text=Create New Column")).toBeVisible({
      timeout: 5000,
    });

    // Click the X close button (the motion.button with X icon)
    const closeButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-x") });
    await closeButton.click();

    // Modal should be gone
    await expect(page.locator("text=Create New Column")).toBeHidden();
  });

  test("should close on overlay click", async ({ mount, page }) => {
    await mount(<CreateColumnModalTestWrapper />);

    await expect(page.locator("text=Create New Column")).toBeVisible({
      timeout: 5000,
    });

    // Click the overlay (top-left corner, outside the modal container)
    await page.mouse.click(10, 10);

    // Modal should be gone
    await expect(page.locator("text=Create New Column")).toBeHidden();
  });
});

test.describe("CreateColumnModal - Edit Mode", () => {
  test("should show Edit Column title and pre-fill fields for existing column", async ({
    mount,
    page,
  }) => {
    const existingColumn = {
      id: "col-1",
      name: "Existing Column",
      query: "What is the effective date?",
      matchText: "effective date",
      outputType: "str",
      limitToLabel: "",
      instructions: "Look for dates",
      mustContainText: "date",
      taskName:
        "opencontractserver.tasks.data_extract_tasks.doc_extract_query_task",
      extractIsList: false,
    };

    await mount(
      <CreateColumnModalTestWrapper existing_column={existingColumn as any} />
    );

    // Should show "Edit Column" title
    await expect(page.locator("text=Edit Column")).toBeVisible({
      timeout: 5000,
    });

    // Footer should show edit message
    await expect(
      page.locator("text=Editing existing column definition")
    ).toBeVisible();

    // Button should say "Save Changes"
    await expect(
      page.getByRole("button", { name: "Save Changes" })
    ).toBeVisible();

    // Fields should be pre-filled
    await expect(
      page.locator('input[placeholder="Enter column name"]')
    ).toHaveValue("Existing Column");
    await expect(
      page.locator(
        'textarea[placeholder="What query shall we use to guide the LLM extraction?"]'
      )
    ).toHaveValue("What is the effective date?");

    await docScreenshot(page, "extracts--create-column-modal--edit-mode");
  });
});

test.describe("CreateColumnModal - Submit", () => {
  test("should submit form data when Create Column is clicked", async ({
    mount,
    page,
  }) => {
    await mount(<CreateColumnModalTestWrapper />);

    await expect(page.locator("text=Create New Column")).toBeVisible({
      timeout: 5000,
    });

    // Fill required fields
    await page
      .locator('input[placeholder="Enter column name"]')
      .fill("Revenue");
    await page
      .locator(
        'textarea[placeholder="What query shall we use to guide the LLM extraction?"]'
      )
      .fill("What is the annual revenue?");

    // Click Create Column
    await page.getByRole("button", { name: "Create Column" }).click();

    // Modal should close
    await expect(page.locator("text=Create New Column")).toBeHidden({
      timeout: 3000,
    });

    // Submitted data should contain our values
    const submittedData = await page
      .locator('[data-testid="submitted-data"]')
      .textContent();
    expect(submittedData).toContain("Revenue");
    expect(submittedData).toContain("What is the annual revenue?");
  });
});
