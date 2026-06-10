import { test, expect } from "./utils/coverage";
import { docScreenshot } from "./utils/docScreenshot";
import { ModelFieldBuilderTestWrapper } from "./ModelFieldBuilderTestWrapper";

test.describe("ModelFieldBuilder", () => {
  test("renders empty state with no initial fields", async ({
    mount,
    page,
  }) => {
    const component = await mount(<ModelFieldBuilderTestWrapper />);

    // Should show the Add Field button
    await expect(component.getByText("Add Field")).toBeVisible();

    // No field rows should be present
    await expect(
      component.locator("input[placeholder='Field Name']")
    ).toHaveCount(0);

    // Field count should be 0
    await expect(component.getByTestId("field-count")).toHaveText("0");

    await docScreenshot(page, "widgets--model-field-builder--empty");

    await component.unmount();
  });

  test("renders with initial fields showing type dropdowns", async ({
    mount,
    page,
  }) => {
    const initialFields = [
      { fieldName: "amount", fieldType: "float", id: "1" },
      { fieldName: "label", fieldType: "str", id: "2" },
      { fieldName: "count", fieldType: "int", id: "3" },
    ];

    const component = await mount(
      <ModelFieldBuilderTestWrapper initialFields={initialFields} />
    );

    // Should render three field name inputs
    const fieldInputs = component.locator("input[placeholder='Field Name']");
    await expect(fieldInputs).toHaveCount(3);

    // Verify the field name values
    await expect(fieldInputs.nth(0)).toHaveValue("amount");
    await expect(fieldInputs.nth(1)).toHaveValue("label");
    await expect(fieldInputs.nth(2)).toHaveValue("count");

    // Each row should have a type dropdown showing the selected value
    // "amount" row should show "Float"
    const dropdownValues = component.locator(".oc-dropdown__value");
    await expect(dropdownValues).toHaveCount(3);

    await docScreenshot(page, "widgets--model-field-builder--with-fields");

    await component.unmount();
  });

  test("add field button adds a new row with dropdown", async ({
    mount,
    page,
  }) => {
    const component = await mount(<ModelFieldBuilderTestWrapper />);

    // Click Add Field
    await component.getByText("Add Field").click();

    // Should now have one field row
    await expect(
      component.locator("input[placeholder='Field Name']")
    ).toHaveCount(1);

    // Should have a type dropdown with default "str" selected
    await expect(component.locator(".oc-dropdown__value")).toHaveCount(1);
    await expect(component.locator(".oc-dropdown__value").first()).toHaveText(
      "String"
    );

    // Add a second field
    await component.getByText("Add Field").click();
    await expect(
      component.locator("input[placeholder='Field Name']")
    ).toHaveCount(2);

    await component.unmount();
  });

  test("field type dropdown shows options (int, float, str, bool)", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <ModelFieldBuilderTestWrapper
        initialFields={[{ fieldName: "test", fieldType: "str", id: "1" }]}
      />
    );

    // Click the type dropdown trigger to open it
    await component.locator(".oc-dropdown__trigger").first().click();

    // The dropdown menu should be visible (may render in portal, check page)
    const menu = page.locator(".oc-dropdown__menu");
    await expect(menu).toBeVisible();

    // Should show all four type options
    const options = menu.locator(".oc-dropdown__option");
    await expect(options).toHaveCount(4);

    await expect(options.filter({ hasText: "Integer" })).toHaveCount(1);
    await expect(options.filter({ hasText: "Float" })).toHaveCount(1);
    await expect(options.filter({ hasText: "String" })).toHaveCount(1);
    await expect(options.filter({ hasText: "Boolean" })).toHaveCount(1);

    await docScreenshot(page, "widgets--model-field-builder--type-dropdown");

    await component.unmount();
  });

  test("remove field button removes the row", async ({ mount, page }) => {
    const initialFields = [
      { fieldName: "field_a", fieldType: "str", id: "1" },
      { fieldName: "field_b", fieldType: "int", id: "2" },
    ];

    const component = await mount(
      <ModelFieldBuilderTestWrapper initialFields={initialFields} />
    );

    // Should start with 2 rows
    await expect(
      component.locator("input[placeholder='Field Name']")
    ).toHaveCount(2);

    // Click the delete button on the first row
    await component.getByLabel("Delete field").first().click();

    // Should now have 1 row
    await expect(
      component.locator("input[placeholder='Field Name']")
    ).toHaveCount(1);

    // The remaining field should be field_b
    await expect(
      component.locator("input[placeholder='Field Name']").first()
    ).toHaveValue("field_b");

    await component.unmount();
  });
});
