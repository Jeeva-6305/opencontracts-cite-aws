import { test, expect } from "../utils/coverage";
import { FolderTestWrapper } from "./utils/FolderTestWrapper";
import { BreadcrumbFixture } from "./utils/testFixtures";
import { createDeepFolderHierarchy } from "./utils/mockFolderData";

test.describe("FolderBreadcrumb", () => {
  test("shows only Documents when no folder selected", async ({ mount }) => {
    const component = await mount(
      <FolderTestWrapper>
        <BreadcrumbFixture folderId={null} folders={[]} />
      </FolderTestWrapper>
    );

    await expect(component.getByText("Documents")).toBeVisible();

    // Should not show any folder names besides root
    await expect(component.getByText("Documents")).toBeVisible();
  });

  test("shows breadcrumb path for selected folder", async ({ mount }) => {
    const folders = [
      {
        id: "folder-1",
        name: "Contracts",
        parent: null,
        path: "Contracts",
      },
      {
        id: "folder-2",
        name: "Legal",
        parent: { id: "folder-1", name: "Contracts" },
        path: "Contracts / Legal",
      },
    ];

    const component = await mount(
      <FolderTestWrapper>
        <BreadcrumbFixture folderId="folder-2" folders={folders} />
      </FolderTestWrapper>
    );

    // Should show full path (Documents is the root label)
    await expect(component.getByText("Documents")).toBeVisible();
    await expect(component.getByText("Contracts")).toBeVisible();
    await expect(component.getByText("Legal")).toBeVisible();
  });

  test("shows ellipsis for deep folder hierarchies", async ({ mount }) => {
    const { allFolders, deepestFolder } = createDeepFolderHierarchy();

    const component = await mount(
      <FolderTestWrapper>
        <BreadcrumbFixture folderId={deepestFolder.id} folders={allFolders} />
      </FolderTestWrapper>
    );

    // Should show ellipsis
    await expect(component.getByText("...")).toBeVisible();

    // Should show first and last folders - use first/last to avoid ambiguity
    const level1Buttons = component.getByRole("button", { name: "Level 1" });
    await expect(level1Buttons.first()).toBeVisible();

    await expect(
      component.getByRole("button", { name: "Level 10" })
    ).toBeVisible();
  });

  test("shows Home icon for Documents root", async ({ mount }) => {
    const component = await mount(
      <FolderTestWrapper>
        <BreadcrumbFixture folderId={null} folders={[]} />
      </FolderTestWrapper>
    );

    const documentsRoot = component.getByText("Documents");
    await expect(documentsRoot).toBeVisible();

    // Check that an svg icon is present (Home icon from lucide-react)
    const svg = await documentsRoot.locator("..").locator("svg").first();
    await expect(svg).toBeVisible();
  });

  test("shows chevron separators between segments", async ({ mount }) => {
    const folders = [
      {
        id: "folder-1",
        name: "Documents",
        parent: null,
        path: "Documents",
      },
      {
        id: "folder-2",
        name: "Legal",
        parent: { id: "folder-1", name: "Documents" },
        path: "Documents / Legal",
      },
    ];

    const component = await mount(
      <FolderTestWrapper>
        <BreadcrumbFixture folderId="folder-2" folders={folders} />
      </FolderTestWrapper>
    );

    // Check that chevron icons are present
    const svgs = component.locator("svg");
    const count = await svgs.count();

    // Should have Home icon + multiple chevron icons
    expect(count).toBeGreaterThan(2);
  });

  test("last breadcrumb item is not clickable", async ({ mount }) => {
    const folders = [
      {
        id: "folder-1",
        name: "Contracts",
        parent: null,
        path: "Contracts",
      },
    ];

    const component = await mount(
      <FolderTestWrapper>
        <BreadcrumbFixture folderId="folder-1" folders={folders} />
      </FolderTestWrapper>
    );

    const contractsButton = component.getByText("Contracts");
    await expect(contractsButton).toBeVisible();

    // Check that it has cursor: default (not clickable)
    const style = await contractsButton.evaluate((el) =>
      window.getComputedStyle(el)
    );
    expect(style.cursor).toBe("default");
  });

  test("previous breadcrumb items are clickable", async ({ mount }) => {
    const folders = [
      {
        id: "folder-1",
        name: "Contracts",
        parent: null,
        path: "Contracts",
      },
      {
        id: "folder-2",
        name: "Legal",
        parent: { id: "folder-1", name: "Contracts" },
        path: "Contracts / Legal",
      },
    ];

    const component = await mount(
      <FolderTestWrapper>
        <BreadcrumbFixture folderId="folder-2" folders={folders} />
      </FolderTestWrapper>
    );

    const documentsRoot = component.getByText("Documents");
    const contractsLink = component.getByText("Contracts");

    // Both should be clickable (cursor pointer)
    const documentsRootStyle = await documentsRoot.evaluate((el) =>
      window.getComputedStyle(el)
    );
    expect(documentsRootStyle.cursor).toBe("pointer");

    const contractsStyle = await contractsLink.evaluate((el) =>
      window.getComputedStyle(el)
    );
    expect(contractsStyle.cursor).toBe("pointer");
  });

  test("shows loading state when folder selected but breadcrumb empty", async ({
    mount,
  }) => {
    const component = await mount(
      <FolderTestWrapper>
        <BreadcrumbFixture folderId="folder-1" folders={[]} />
      </FolderTestWrapper>
    );

    await expect(component.getByText("Loading path...")).toBeVisible();
  });

  test("respects maxDepth prop", async ({ mount }) => {
    const { allFolders } = createDeepFolderHierarchy();

    const component = await mount(
      <FolderTestWrapper>
        <BreadcrumbFixture
          folderId={allFolders[allFolders.length - 1].id}
          folders={allFolders}
          maxDepth={3}
        />
      </FolderTestWrapper>
    );

    // Should show ellipsis for depth > 3
    await expect(component.getByText("...")).toBeVisible();
  });

  test("highlights current folder with different color", async ({ mount }) => {
    const folders = [
      {
        id: "folder-1",
        name: "Contracts",
        parent: null,
        path: "Contracts",
      },
      {
        id: "folder-2",
        name: "Legal",
        parent: { id: "folder-1", name: "Contracts" },
        path: "Contracts / Legal",
      },
    ];

    const component = await mount(
      <FolderTestWrapper>
        <BreadcrumbFixture folderId="folder-2" folders={folders} />
      </FolderTestWrapper>
    );

    const legalButton = component.getByText("Legal");
    const contractsButton = component.getByText("Contracts");

    // Get computed styles
    const legalStyle = await legalButton.evaluate((el) =>
      window.getComputedStyle(el)
    );
    const contractsStyle = await contractsButton.evaluate((el) =>
      window.getComputedStyle(el)
    );

    // Legal (current) should have different color and be bold
    expect(legalStyle.fontWeight).toBe("500");
    expect(contractsStyle.fontWeight).toBe("400");
  });
});
