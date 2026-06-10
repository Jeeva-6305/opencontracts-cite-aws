import { test, expect } from "../utils/coverage";
import { FolderTestWrapper } from "./utils/FolderTestWrapper";
import { RemoveDocumentsModalFixture } from "./utils/testFixtures";
import { docScreenshot } from "../utils/docScreenshot";

test.describe("RemoveDocumentsModal", () => {
  test.describe("Modal Visibility", () => {
    test("renders when showModal is true and documentIds has items", async ({
      mount,
      page,
    }) => {
      const component = await mount(
        <FolderTestWrapper>
          <RemoveDocumentsModalFixture
            showModal={true}
            documentIds={["doc-1", "doc-2"]}
          />
        </FolderTestWrapper>
      );

      // Modal renders to document.body (portal), so check page not component
      await expect(page.getByText("Remove Documents from Corpus")).toBeVisible({
        timeout: 5000,
      });

      await docScreenshot(
        page,
        "folders--remove-documents-modal--confirmation"
      );
    });

    test("does not render when showModal is false", async ({ mount, page }) => {
      const component = await mount(
        <FolderTestWrapper>
          <RemoveDocumentsModalFixture
            showModal={false}
            documentIds={["doc-1"]}
          />
        </FolderTestWrapper>
      );

      // Modal should not be visible
      await expect(
        page.getByText("Remove Documents from Corpus")
      ).not.toBeVisible();
    });

    test("does not render when documentIds is empty", async ({
      mount,
      page,
    }) => {
      const component = await mount(
        <FolderTestWrapper>
          <RemoveDocumentsModalFixture showModal={true} documentIds={[]} />
        </FolderTestWrapper>
      );

      // Modal should not be visible
      await expect(
        page.getByText("Remove Documents from Corpus")
      ).not.toBeVisible();
    });
  });

  test.describe("Document Count Display", () => {
    test("shows correct count for multiple documents", async ({
      mount,
      page,
    }) => {
      const component = await mount(
        <FolderTestWrapper>
          <RemoveDocumentsModalFixture
            showModal={true}
            documentIds={["doc-1", "doc-2", "doc-3"]}
          />
        </FolderTestWrapper>
      );

      // Should show "3 documents" in the strong tag within warning text
      await expect(
        page.locator("strong", { hasText: "3 documents" })
      ).toBeVisible({
        timeout: 5000,
      });
      // Info box should show count
      await expect(page.getByText("Documents to remove:")).toBeVisible();
    });

    test("shows correct singular text for 1 document", async ({
      mount,
      page,
    }) => {
      const component = await mount(
        <FolderTestWrapper>
          <RemoveDocumentsModalFixture
            showModal={true}
            documentIds={["doc-1"]}
          />
        </FolderTestWrapper>
      );

      // Should show "1 document" (singular) in the strong tag
      await expect(
        page.locator("strong", { hasText: "1 document" })
      ).toBeVisible({
        timeout: 5000,
      });
    });

    test("remove button shows correct count", async ({ mount, page }) => {
      const component = await mount(
        <FolderTestWrapper>
          <RemoveDocumentsModalFixture
            showModal={true}
            documentIds={["doc-1", "doc-2"]}
          />
        </FolderTestWrapper>
      );

      // Remove button should show "Remove 2 Documents"
      const removeButton = page.getByRole("button", {
        name: "Remove 2 Documents",
      });
      await expect(removeButton).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("Modal Actions", () => {
    test("has Cancel button", async ({ mount, page }) => {
      const component = await mount(
        <FolderTestWrapper>
          <RemoveDocumentsModalFixture
            showModal={true}
            documentIds={["doc-1"]}
          />
        </FolderTestWrapper>
      );

      await expect(page.getByText("Cancel")).toBeVisible({ timeout: 5000 });
    });

    test("has Remove button with danger styling", async ({ mount, page }) => {
      const component = await mount(
        <FolderTestWrapper>
          <RemoveDocumentsModalFixture
            showModal={true}
            documentIds={["doc-1"]}
          />
        </FolderTestWrapper>
      );

      // Remove button should use the design system's danger variant
      const removeButton = page.getByRole("button", {
        name: /Remove 1 Document/,
      });
      await expect(removeButton).toBeVisible({ timeout: 5000 });
      await expect(removeButton).toHaveClass(/oc-button--danger/);
    });

    test("has close button in header", async ({ mount, page }) => {
      const component = await mount(
        <FolderTestWrapper>
          <RemoveDocumentsModalFixture
            showModal={true}
            documentIds={["doc-1"]}
          />
        </FolderTestWrapper>
      );

      const closeButton = page.getByRole("button", { name: "Close" });
      await expect(closeButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Warning Content", () => {
    test("displays warning about removal", async ({ mount, page }) => {
      const component = await mount(
        <FolderTestWrapper>
          <RemoveDocumentsModalFixture
            showModal={true}
            documentIds={["doc-1"]}
          />
        </FolderTestWrapper>
      );

      // Should explain what happens
      await expect(page.getByText("Confirm Removal")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText("will remain in your library")).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("close button has aria-label", async ({ mount, page }) => {
      const component = await mount(
        <FolderTestWrapper>
          <RemoveDocumentsModalFixture
            showModal={true}
            documentIds={["doc-1"]}
          />
        </FolderTestWrapper>
      );

      const closeButton = page.getByRole("button", { name: "Close" });
      await expect(closeButton).toHaveAttribute("aria-label", "Close");
    });
  });
});
