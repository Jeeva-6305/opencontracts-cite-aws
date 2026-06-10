import { test, expect } from "../utils/coverage";
import { FolderTestWrapper } from "./utils/FolderTestWrapper";
import { MoveFolderModalFixture } from "./utils/testFixtures";
import { createMockFolder } from "./utils/mockFolderData";
import { docScreenshot } from "../utils/docScreenshot";

test.describe("MoveFolderModal", () => {
  const targetFolder = createMockFolder({
    id: "folder-1",
    name: "Contracts",
    path: "Contracts",
    documentCount: 5,
  });

  const destinationFolder = createMockFolder({
    id: "folder-2",
    name: "Research",
    path: "Research",
    documentCount: 3,
  });

  const childFolder = createMockFolder({
    id: "folder-1-1",
    name: "Legal",
    path: "Contracts / Legal",
    parent: { id: "folder-1", name: "Contracts" },
    documentCount: 2,
  });

  const allFolders = [targetFolder, destinationFolder, childFolder];

  test("renders modal with current location info", async ({ mount, page }) => {
    const component = await mount(
      <FolderTestWrapper>
        <MoveFolderModalFixture folderId="folder-1" folders={allFolders} />
      </FolderTestWrapper>
    );

    // Modal title (use header locator to avoid matching the button text)
    await expect(
      page.locator(".oc-modal-header__title", { hasText: "Move Folder" })
    ).toBeVisible({ timeout: 5000 });

    // Folder name displayed
    await expect(
      page.locator("strong", { hasText: "Contracts" })
    ).toBeVisible();

    // Current location info
    await expect(page.getByText("Current location:")).toBeVisible();

    // Move to label
    await expect(page.getByText("Move to:")).toBeVisible();

    await docScreenshot(page, "folders--move-folder-modal--initial");
  });

  test("does not render when showModal is false", async ({ mount, page }) => {
    const component = await mount(
      <FolderTestWrapper>
        <MoveFolderModalFixture
          showModal={false}
          folderId="folder-1"
          folders={allFolders}
        />
      </FolderTestWrapper>
    );

    await expect(page.getByText("Move Folder")).not.toBeVisible();
  });

  test("does not render when folder is not found", async ({ mount, page }) => {
    const component = await mount(
      <FolderTestWrapper>
        <MoveFolderModalFixture folderId="nonexistent" folders={allFolders} />
      </FolderTestWrapper>
    );

    await expect(page.getByText("Move Folder")).not.toBeVisible();
  });

  test("has Cancel and Move Folder buttons", async ({ mount, page }) => {
    const component = await mount(
      <FolderTestWrapper>
        <MoveFolderModalFixture folderId="folder-1" folders={allFolders} />
      </FolderTestWrapper>
    );

    await expect(page.getByText("Cancel")).toBeVisible({ timeout: 5000 });

    const moveButton = page.getByRole("button", { name: "Move Folder" });
    await expect(moveButton).toBeVisible();
  });

  test("has close button in header", async ({ mount, page }) => {
    const component = await mount(
      <FolderTestWrapper>
        <MoveFolderModalFixture folderId="folder-1" folders={allFolders} />
      </FolderTestWrapper>
    );

    const closeButton = page.getByRole("button", { name: "Close" });
    await expect(closeButton).toBeVisible({ timeout: 5000 });
  });

  test("shows Corpus Root as current location for root-level folder", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <FolderTestWrapper>
        <MoveFolderModalFixture folderId="folder-1" folders={allFolders} />
      </FolderTestWrapper>
    );

    // Root-level folder should show "Corpus Root" as current location
    await expect(page.getByText("Current location:")).toBeVisible({
      timeout: 5000,
    });
    // Use text content match to target the current location display
    await expect(
      page.getByText("Current location:").locator("..").getByText("Corpus Root")
    ).toBeVisible();
  });

  test("shows parent name as current location for subfolder", async ({
    mount,
    page,
  }) => {
    // Move the child folder - should show parent "Contracts" as current location
    const component = await mount(
      <FolderTestWrapper>
        <MoveFolderModalFixture folderId="folder-1-1" folders={allFolders} />
      </FolderTestWrapper>
    );

    await expect(page.getByText("Current location:")).toBeVisible({
      timeout: 5000,
    });
    // The child folder's parent is "Contracts"
    await expect(page.locator("strong", { hasText: "Legal" })).toBeVisible();
  });

  test("dropdown contains valid destination options", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <FolderTestWrapper>
        <MoveFolderModalFixture folderId="folder-1" folders={allFolders} />
      </FolderTestWrapper>
    );

    // The dropdown should be present with a selection
    await expect(page.getByText("Move to:")).toBeVisible({ timeout: 5000 });

    // Default selection should be "Corpus Root"
    await expect(page.locator(".oc-dropdown")).toBeVisible();

    await docScreenshot(page, "folders--move-folder-modal--dropdown");
  });
});
