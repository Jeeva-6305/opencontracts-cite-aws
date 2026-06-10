/**
 * Playwright component tests for the CAML article landing view.
 *
 * Tests cover:
 * 1. Article view renders as the corpus home when Readme.CAML exists
 *    (instead of the default landing page)
 * 2. Floating controls (chat bar) appear overlaid on the article
 *
 * NOTE: The full CAML article body will not render because
 * CorpusArticleView uses fetch() to load content from txtExtractFile,
 * which fails in component tests. The article *container* (toolbar +
 * test-id) and the floating controls still render and are verified here.
 */
import { test, expect } from "./utils/coverage";
import { docScreenshot } from "./utils/docScreenshot";
import { CorpusHomeArticleLandingTestWrapper } from "./CorpusHomeArticleLandingTestWrapper";

test.use({ viewport: { width: 1200, height: 800 } });

test.describe("CorpusHome - Article as Landing View", () => {
  test("should render article view with floating controls when Readme.CAML exists", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <CorpusHomeArticleLandingTestWrapper hasArticle={true} />
    );

    // The article container should render (CorpusArticleView, not CorpusLandingView)
    await expect(page.getByTestId("corpus-home-article")).toBeVisible({
      timeout: 15000,
    });

    // Article toolbar should have the Back button
    await expect(page.getByText("Back")).toBeVisible();

    // The floating controls should be visible at the bottom
    await expect(
      page.getByTestId("corpus-article-floating-controls")
    ).toBeVisible({ timeout: 5000 });

    // Chat input should be in the floating bar
    await expect(page.getByTestId("corpus-article-chat-input")).toBeVisible();

    // The landing-specific elements should NOT be present because
    // the article view replaced the landing page
    await expect(page.getByTestId("corpus-home-landing")).toHaveCount(0);

    await docScreenshot(page, "caml--corpus-home--article-landing");

    await component.unmount();
  });
});
