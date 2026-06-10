import React from "react";
import { test, expect } from "./utils/coverage";
import {
  CreateAndSearchBar,
  DropdownActionProps,
} from "../src/components/layout/CreateAndSearchBar";
import { docScreenshot } from "./utils/docScreenshot";

const sampleActions: DropdownActionProps[] = [
  {
    icon: "file-plus",
    title: "New Document",
    key: "new-doc",
    color: "#3498db",
    action_function: () => {},
  },
  {
    icon: "folder-plus",
    title: "New Folder",
    key: "new-folder",
    color: "#2ecc71",
    action_function: () => {},
  },
];

test.describe("CreateAndSearchBar", () => {
  test("renders search input and action button", async ({ mount, page }) => {
    await mount(
      <CreateAndSearchBar actions={sampleActions} placeholder="Search docs…" />
    );

    // Search input should be visible with the correct placeholder
    const input = page.getByPlaceholder("Search docs…");
    await expect(input).toBeVisible();

    // Add button should be visible
    const addButton = page.getByRole("button", { name: "Add" });
    await expect(addButton).toBeVisible();

    await docScreenshot(page, "layout--create-and-search-bar--default");
  });

  test("opens dropdown menu on add button click", async ({ mount, page }) => {
    await mount(
      <CreateAndSearchBar actions={sampleActions} placeholder="Search docs…" />
    );

    // Click the add button
    const addButton = page.getByRole("button", { name: "Add" });
    await addButton.click();

    // Dropdown items should appear
    await expect(page.getByText("New Document")).toBeVisible();
    await expect(page.getByText("New Folder")).toBeVisible();

    await docScreenshot(page, "layout--create-and-search-bar--dropdown-open");
  });

  test("shows filter button when filters are provided", async ({
    mount,
    page,
  }) => {
    const filterContent = <div>Filter options here</div>;

    await mount(
      <CreateAndSearchBar
        actions={sampleActions}
        filters={filterContent}
        placeholder="Search…"
      />
    );

    // Filter button should be visible
    const filterButton = page.getByRole("button", { name: "Filter" });
    await expect(filterButton).toBeVisible();

    // Click to open filter popover
    await filterButton.click();
    await expect(page.getByText("Filter options here")).toBeVisible();

    await docScreenshot(page, "layout--create-and-search-bar--filter-popover");
  });

  test("renders without actions", async ({ mount, page }) => {
    await mount(<CreateAndSearchBar actions={[]} placeholder="Search…" />);

    // Search input should be visible
    await expect(page.getByPlaceholder("Search…")).toBeVisible();

    // Add button should NOT be visible when no actions
    await expect(page.getByRole("button", { name: "Add" })).not.toBeVisible();

    await docScreenshot(page, "layout--create-and-search-bar--no-actions");
  });
});
