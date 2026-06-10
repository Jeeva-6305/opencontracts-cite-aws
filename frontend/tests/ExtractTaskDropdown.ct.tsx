import { test, expect } from "./utils/coverage";
import { docScreenshot } from "./utils/docScreenshot";
import { ExtractTaskDropdownTestWrapper } from "./ExtractTaskDropdownTestWrapper";
import { GET_REGISTERED_EXTRACT_TASKS } from "../src/graphql/queries";

const extractTasksMock = {
  request: { query: GET_REGISTERED_EXTRACT_TASKS },
  result: {
    data: {
      registeredExtractTasks: {
        ExtractFinancialData: "Extract financial data from documents",
        ExtractEntities: "Extract named entities from text",
        SummarizeDocument: "Generate document summaries",
      },
    },
  },
};

// Duplicate mocks for refetches (component uses network-only + refetch on search)
const extractTasksMockRefetch = { ...extractTasksMock };
const extractTasksMockRefetch2 = { ...extractTasksMock };
const extractTasksMockRefetch3 = { ...extractTasksMock };

test.describe("ExtractTaskDropdown", () => {
  test("renders with placeholder when no task selected", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <ExtractTaskDropdownTestWrapper
        mocks={[
          extractTasksMock,
          extractTasksMockRefetch,
          extractTasksMockRefetch2,
          extractTasksMockRefetch3,
        ]}
      />
    );

    // Wait for data to load - placeholder should appear
    await expect(component.locator(".oc-dropdown__placeholder")).toBeVisible({
      timeout: 5000,
    });
    await expect(component.locator(".oc-dropdown__placeholder")).toHaveText(
      "Select a task"
    );

    await docScreenshot(page, "widgets--extract-task-dropdown--default");

    await component.unmount();
  });

  test("renders with pre-selected task", async ({ mount, page }) => {
    const component = await mount(
      <ExtractTaskDropdownTestWrapper
        taskName="ExtractFinancialData"
        mocks={[
          extractTasksMock,
          extractTasksMockRefetch,
          extractTasksMockRefetch2,
          extractTasksMockRefetch3,
        ]}
      />
    );

    // Wait for the selected value to show
    await expect(component.locator(".oc-dropdown__value")).toBeVisible({
      timeout: 5000,
    });
    await expect(component.locator(".oc-dropdown__value")).toHaveText(
      "ExtractFinancialData"
    );

    await docScreenshot(page, "widgets--extract-task-dropdown--with-selection");

    await component.unmount();
  });

  test("disabled in read_only mode", async ({ mount, page }) => {
    const component = await mount(
      <ExtractTaskDropdownTestWrapper
        read_only={true}
        mocks={[
          extractTasksMock,
          extractTasksMockRefetch,
          extractTasksMockRefetch2,
          extractTasksMockRefetch3,
        ]}
      />
    );

    // Wait for loading to finish
    await expect(component.locator(".oc-dropdown__placeholder")).toBeVisible({
      timeout: 5000,
    });

    // The dropdown trigger should be disabled
    const trigger = component.locator(".oc-dropdown__trigger");
    await expect(trigger).toBeDisabled();

    await component.unmount();
  });

  test("dropdown shows task options", async ({ mount, page }) => {
    const component = await mount(
      <ExtractTaskDropdownTestWrapper
        mocks={[
          extractTasksMock,
          extractTasksMockRefetch,
          extractTasksMockRefetch2,
          extractTasksMockRefetch3,
        ]}
      />
    );

    // Wait for data to load
    await expect(component.locator(".oc-dropdown__placeholder")).toHaveText(
      "Select a task",
      { timeout: 5000 }
    );

    // Open the dropdown
    await component.locator(".oc-dropdown__trigger").click();

    // Menu should be visible (may render via portal)
    const menu = page.locator(".oc-dropdown__menu");
    await expect(menu).toBeVisible();

    // Should show all three task options
    const options = menu.locator(".oc-dropdown__option");
    await expect(options).toHaveCount(3);

    await expect(
      options.filter({ hasText: "ExtractFinancialData" })
    ).toHaveCount(1);
    await expect(options.filter({ hasText: "ExtractEntities" })).toHaveCount(1);
    await expect(options.filter({ hasText: "SummarizeDocument" })).toHaveCount(
      1
    );

    await component.unmount();
  });
});
