import React from "react";
import { test, expect } from "./utils/coverage";
import { DocumentFormFields } from "../src/components/forms/DocumentFormFields";
import { docScreenshot } from "./utils/docScreenshot";

test.describe("DocumentFormFields", () => {
  test("renders empty create form with all fields", async ({ mount, page }) => {
    const component = await mount(
      <DocumentFormFields formData={{}} onChange={() => {}} />
    );

    await expect(page.getByLabel("Title *")).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel("Slug")).toBeVisible();
    await expect(page.getByLabel("Description *")).toBeVisible();

    // Verify fields are empty
    await expect(page.getByLabel("Title *")).toHaveValue("");
    await expect(page.getByLabel("Slug")).toHaveValue("");
    await expect(page.getByLabel("Description *")).toHaveValue("");

    await docScreenshot(page, "forms--document-fields--empty");

    await component.unmount();
  });

  test("renders with pre-filled data", async ({ mount, page }) => {
    const component = await mount(
      <DocumentFormFields
        formData={{
          title: "My Contract",
          slug: "my-contract",
          description: "A sample contract document for testing.",
        }}
        onChange={() => {}}
      />
    );

    await expect(page.getByLabel("Title *")).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel("Title *")).toHaveValue("My Contract");
    await expect(page.getByLabel("Slug")).toHaveValue("my-contract");
    await expect(page.getByLabel("Description *")).toHaveValue(
      "A sample contract document for testing."
    );

    await docScreenshot(page, "forms--document-fields--prefilled");

    await component.unmount();
  });

  test("renders in disabled state", async ({ mount, page }) => {
    const component = await mount(
      <DocumentFormFields
        formData={{
          title: "Read-Only Document",
          slug: "read-only",
          description: "This form is disabled.",
        }}
        onChange={() => {}}
        disabled={true}
      />
    );

    await expect(page.getByLabel("Title *")).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel("Title *")).toBeDisabled();
    await expect(page.getByLabel("Slug")).toBeDisabled();
    await expect(page.getByLabel("Description *")).toBeDisabled();

    await docScreenshot(page, "forms--document-fields--disabled");

    await component.unmount();
  });

  test("fields are interactive when not disabled", async ({ mount, page }) => {
    const component = await mount(
      <DocumentFormFields formData={{}} onChange={() => {}} disabled={false} />
    );

    // All fields should be enabled and focusable
    await expect(page.getByLabel("Title *")).toBeEnabled();
    await expect(page.getByLabel("Slug")).toBeEnabled();
    await expect(page.getByLabel("Description *")).toBeEnabled();

    // Title field should accept focus
    await page.getByLabel("Title *").focus();
    await expect(page.getByLabel("Title *")).toBeFocused();

    await component.unmount();
  });
});
