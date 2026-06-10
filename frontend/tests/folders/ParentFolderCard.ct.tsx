import { test, expect } from "../utils/coverage";
import { ParentFolderCard } from "../../src/components/corpuses/folders/ParentFolderCard";
import { ParentFolderCardTestWrapper } from "./utils/ParentFolderCardTestWrapper";

/**
 * ParentFolderCard Component Tests
 *
 * Tests the ".." navigation card that allows users to navigate
 * back to the parent folder. Also supports drag-drop for moving
 * documents/folders to parent.
 */

test.describe("ParentFolderCard", () => {
  test("renders card view with '..' title", async ({ mount }) => {
    const component = await mount(
      <ParentFolderCardTestWrapper>
        <ParentFolderCard
          parentFolderId="folder-1"
          parentFolderName="Documents"
          viewMode="modern-card"
        />
      </ParentFolderCardTestWrapper>
    );

    await expect(component.getByText("..")).toBeVisible({ timeout: 3000 });
    await expect(component.getByText("Go to Documents")).toBeVisible({
      timeout: 3000,
    });
  });

  test("renders list view with '..' title", async ({ mount }) => {
    const component = await mount(
      <ParentFolderCardTestWrapper>
        <ParentFolderCard
          parentFolderId="folder-1"
          parentFolderName="Documents"
          viewMode="modern-list"
        />
      </ParentFolderCardTestWrapper>
    );

    await expect(component.getByText("..")).toBeVisible({ timeout: 3000 });
    await expect(component.getByText("Go to Documents")).toBeVisible({
      timeout: 3000,
    });
  });

  test("shows 'Corpus Root' when parent is null", async ({ mount }) => {
    const component = await mount(
      <ParentFolderCardTestWrapper>
        <ParentFolderCard parentFolderId={null} viewMode="modern-card" />
      </ParentFolderCardTestWrapper>
    );

    await expect(component.getByText("..")).toBeVisible({ timeout: 3000 });
    await expect(component.getByText("Go to Corpus Root")).toBeVisible({
      timeout: 3000,
    });
  });

  test("has clickable cursor style", async ({ mount }) => {
    const component = await mount(
      <ParentFolderCardTestWrapper>
        <ParentFolderCard
          parentFolderId="folder-1"
          parentFolderName="Documents"
          viewMode="modern-card"
        />
      </ParentFolderCardTestWrapper>
    );

    // Find the card container and check it has pointer cursor
    const card = component.locator("div").first();
    const style = await card.evaluate((el) => window.getComputedStyle(el));
    expect(style.cursor).toBe("pointer");
  });

  test("displays folder-up icon", async ({ mount }) => {
    const component = await mount(
      <ParentFolderCardTestWrapper>
        <ParentFolderCard
          parentFolderId="folder-1"
          parentFolderName="Documents"
          viewMode="modern-card"
        />
      </ParentFolderCardTestWrapper>
    );

    // Look for the FolderUp SVG icon (lucide-react)
    const svgIcon = component.locator("svg");
    await expect(svgIcon).toBeVisible({ timeout: 3000 });
  });

  test("renders in list mode with correct structure", async ({ mount }) => {
    const component = await mount(
      <ParentFolderCardTestWrapper>
        <ParentFolderCard
          parentFolderId="parent-1"
          parentFolderName="Parent Folder"
          viewMode="modern-list"
        />
      </ParentFolderCardTestWrapper>
    );

    // Should have the ".." text
    await expect(component.getByText("..")).toBeVisible({ timeout: 3000 });

    // Should have subtitle with parent folder name
    await expect(component.getByText("Go to Parent Folder")).toBeVisible({
      timeout: 3000,
    });
  });
});
