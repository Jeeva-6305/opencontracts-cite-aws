import { test, expect } from "../utils/coverage";
import { FolderTestWrapper } from "./utils/FolderTestWrapper";
import { EditFolderModalFixture } from "./utils/testFixtures";
import { createMockFolder } from "./utils/mockFolderData";
import { docScreenshot } from "../utils/docScreenshot";

test.describe("EditFolderModal", () => {
  const targetFolder = createMockFolder({
    id: "folder-1",
    name: "Contracts",
    description: "Legal contracts folder",
    color: "#3b82f6",
    icon: "file-text",
    tags: ["legal", "contracts"],
    path: "Contracts",
    documentCount: 5,
  });

  const siblingFolder = createMockFolder({
    id: "folder-2",
    name: "Research",
    path: "Research",
  });

  const allFolders = [targetFolder, siblingFolder];

  test("renders modal with pre-populated form fields", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <FolderTestWrapper>
        <EditFolderModalFixture folderId="folder-1" folders={allFolders} />
      </FolderTestWrapper>
    );

    // Modal title
    await expect(page.getByText("Edit Folder")).toBeVisible({ timeout: 5000 });

    // Form labels
    await expect(page.getByText("Folder Name")).toBeVisible();
    await expect(page.getByText("Description")).toBeVisible();
    await expect(page.getByText("Color")).toBeVisible();
    await expect(page.getByText("Use Lucide React icon names")).toBeVisible();
    await expect(
      page.getByText("Comma-separated tags for organization")
    ).toBeVisible();

    // Pre-populated values
    const nameInput = page.getByPlaceholder("Enter folder name");
    await expect(nameInput).toHaveValue("Contracts");

    const descriptionInput = page.getByPlaceholder("Optional description");
    await expect(descriptionInput).toHaveValue("Legal contracts folder");

    await docScreenshot(page, "folders--edit-folder-modal--initial");
  });

  test("does not render when showModal is false", async ({ mount, page }) => {
    const component = await mount(
      <FolderTestWrapper>
        <EditFolderModalFixture
          showModal={false}
          folderId="folder-1"
          folders={allFolders}
        />
      </FolderTestWrapper>
    );

    await expect(page.getByText("Edit Folder")).not.toBeVisible();
  });

  test("does not render when folder is not found", async ({ mount, page }) => {
    const component = await mount(
      <FolderTestWrapper>
        <EditFolderModalFixture folderId="nonexistent" folders={allFolders} />
      </FolderTestWrapper>
    );

    await expect(page.getByText("Edit Folder")).not.toBeVisible();
  });

  test("has Cancel and Save Changes buttons", async ({ mount, page }) => {
    const component = await mount(
      <FolderTestWrapper>
        <EditFolderModalFixture folderId="folder-1" folders={allFolders} />
      </FolderTestWrapper>
    );

    await expect(page.getByText("Cancel")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Save Changes")).toBeVisible();
  });

  test("Save Changes button is disabled when name is empty", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <FolderTestWrapper>
        <EditFolderModalFixture folderId="folder-1" folders={allFolders} />
      </FolderTestWrapper>
    );

    // Clear the name field
    const nameInput = page.getByPlaceholder("Enter folder name");
    await nameInput.clear();

    const saveButton = page.getByRole("button", { name: "Save Changes" });
    await expect(saveButton).toBeDisabled();
  });

  test("allows editing the folder name", async ({ mount, page }) => {
    const component = await mount(
      <FolderTestWrapper>
        <EditFolderModalFixture folderId="folder-1" folders={allFolders} />
      </FolderTestWrapper>
    );

    const nameInput = page.getByPlaceholder("Enter folder name");
    await nameInput.clear();
    await nameInput.fill("Updated Contracts");

    await expect(nameInput).toHaveValue("Updated Contracts");

    // Save button should be enabled now
    const saveButton = page.getByRole("button", { name: "Save Changes" });
    await expect(saveButton).toBeEnabled();
  });

  test("has close button in header", async ({ mount, page }) => {
    const component = await mount(
      <FolderTestWrapper>
        <EditFolderModalFixture folderId="folder-1" folders={allFolders} />
      </FolderTestWrapper>
    );

    const closeButton = page.getByRole("button", { name: "Close" });
    await expect(closeButton).toBeVisible({ timeout: 5000 });
  });
});
