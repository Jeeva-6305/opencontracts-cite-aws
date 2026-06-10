/**
 * Component Tests for Mention Rendering
 *
 * Tests the MarkdownMessageRenderer mention badge rendering:
 * - User mentions render as styled badges
 * - Corpus mentions render as styled badges
 * - Document mentions render as styled badges
 * - Annotation mentions render as styled badges
 * - Agent mentions render as styled badges (non-navigable)
 * - Regular links still work
 * - Markdown formatting works with mentions
 */
import { test, expect } from "./utils/coverage";
import { MentionTestWrapper } from "./MentionRenderingTestWrapper";

test.describe("MentionRendering - User Mentions", () => {
  test("renders user mention as styled badge", async ({ mount, page }) => {
    await mount(
      <MentionTestWrapper content="Hello [@testuser](/users/testuser), how are you?" />
    );

    // User mention should be visible as a link
    const mentionLink = page.locator('a[href="/users/testuser"]');
    await expect(mentionLink).toBeVisible();
    await expect(mentionLink).toContainText("@testuser");
  });

  test("user mention has href for navigation", async ({ mount, page }) => {
    await mount(
      <MentionTestWrapper content="Check out [@testuser](/users/testuser)" />
    );

    // Should have href attribute (navigable)
    const mention = page.locator('a[href="/users/testuser"]');
    await expect(mention).toBeVisible();
  });

  test("user mention shows tooltip", async ({ mount, page }) => {
    await mount(
      <MentionTestWrapper content="Hello [@testuser](/users/testuser)" />
    );

    const mention = page.locator('a[href="/users/testuser"]');
    await expect(mention).toHaveAttribute("title", /User:/);
  });
});

test.describe("MentionRendering - Corpus Mentions", () => {
  test("renders corpus mention as styled badge", async ({ mount, page }) => {
    await mount(
      <MentionTestWrapper content="See the [@test-corpus](/c/creator/test-corpus) for more info." />
    );

    const mention = page.locator('a[href="/c/creator/test-corpus"]');
    await expect(mention).toBeVisible();
    await expect(mention).toContainText("@test-corpus");
  });

  test("corpus mention has href for navigation", async ({ mount, page }) => {
    await mount(
      <MentionTestWrapper content="Check [@my-corpus](/c/user/my-corpus)" />
    );

    const mention = page.locator('a[href="/c/user/my-corpus"]');
    await expect(mention).toBeVisible();
  });
});

test.describe("MentionRendering - Document Mentions", () => {
  test("renders document mention as styled badge", async ({ mount, page }) => {
    await mount(
      <MentionTestWrapper content="Read [@contract.pdf](/d/user/corpus/contract-pdf)" />
    );

    const mention = page.locator('a[href="/d/user/corpus/contract-pdf"]');
    await expect(mention).toBeVisible();
    await expect(mention).toContainText("@contract.pdf");
  });

  test("document mention has href for navigation", async ({ mount, page }) => {
    await mount(
      <MentionTestWrapper content="See [@doc](/d/user/corpus/doc)" />
    );

    const mention = page.locator('a[href="/d/user/corpus/doc"]');
    await expect(mention).toBeVisible();
  });
});

test.describe("MentionRendering - Annotation Mentions", () => {
  test("renders annotation mention as styled badge", async ({
    mount,
    page,
  }) => {
    await mount(
      <MentionTestWrapper content="See this [@annotation](/d/user/corpus/doc?ann=123&structural=true)" />
    );

    // Annotation mention should be visible (has ?ann= in URL)
    const mention = page.locator("a").filter({ hasText: "@annotation" });
    await expect(mention).toBeVisible();
  });
});

test.describe("MentionRendering - Agent Mentions", () => {
  test("renders global agent mention as styled badge", async ({
    mount,
    page,
  }) => {
    await mount(
      <MentionTestWrapper content="Ask [@agent:helper-bot](/agents/helper-bot) for help" />
    );

    const mention = page.locator("a").filter({ hasText: "@agent:helper-bot" });
    await expect(mention).toBeVisible();
  });

  test("renders corpus-scoped agent mention as styled badge", async ({
    mount,
    page,
  }) => {
    await mount(
      <MentionTestWrapper content="Try [@agent:corpus-bot](/c/abc123/Test%20Corpus/agents/corpus-bot)" />
    );

    const mention = page.locator("a").filter({ hasText: "@agent:corpus-bot" });
    await expect(mention).toBeVisible();
  });

  test("agent mention shows 'coming soon' in tooltip", async ({
    mount,
    page,
  }) => {
    await mount(
      <MentionTestWrapper content="Ask [@agent:my-agent](/agents/my-agent)" />
    );

    const mention = page.locator("a").filter({ hasText: "@agent:my-agent" });
    await expect(mention).toHaveAttribute("title", /coming soon/i);
  });

  test("agent mention does not have href (non-navigable)", async ({
    mount,
    page,
  }) => {
    await mount(<MentionTestWrapper content="Ask [@agent:bot](/agents/bot)" />);

    const mention = page.locator("a").filter({ hasText: "@agent:bot" });
    // Non-navigable mentions don't have href
    await expect(mention).not.toHaveAttribute("href");
  });
});

test.describe("MentionRendering - Mixed Content", () => {
  test("renders multiple mention types in same message", async ({
    mount,
    page,
  }) => {
    await mount(
      <MentionTestWrapper content="Hey [@john](/users/john), check out the [@contract](/d/user/corpus/contract) in [@legal-corpus](/c/user/legal-corpus). You can ask [@agent:helper](/agents/helper) for assistance." />
    );

    // All mentions should be visible
    await expect(page.locator("a").filter({ hasText: "@john" })).toBeVisible();
    await expect(
      page.locator("a").filter({ hasText: "@contract" })
    ).toBeVisible();
    await expect(
      page.locator("a").filter({ hasText: "@legal-corpus" })
    ).toBeVisible();
    await expect(
      page.locator("a").filter({ hasText: "@agent:helper" })
    ).toBeVisible();
  });

  test("regular links still work normally", async ({ mount, page }) => {
    await mount(
      <MentionTestWrapper content="Check out [Google](https://google.com) for more info and [@user](/users/user) for contact." />
    );

    // Regular link should have target="_blank"
    const googleLink = page.locator('a[href="https://google.com"]');
    await expect(googleLink).toBeVisible();
    await expect(googleLink).toHaveAttribute("target", "_blank");

    // Mention should also be visible
    const mention = page.locator('a[href="/users/user"]');
    await expect(mention).toBeVisible();
  });
});

test.describe("MentionRendering - Markdown Formatting", () => {
  test("renders markdown with bold text", async ({ mount, page }) => {
    await mount(
      <MentionTestWrapper content="This is **bold** and this is a [@mention](/users/user)" />
    );

    await expect(page.locator("strong")).toContainText("bold");
    await expect(
      page.locator("a").filter({ hasText: "@mention" })
    ).toBeVisible();
  });

  test("renders markdown with code blocks", async ({ mount, page }) => {
    await mount(
      <MentionTestWrapper content="Use `code` like this. Also see [@dev](/users/dev) for help." />
    );

    await expect(page.locator("code")).toContainText("code");
    await expect(page.locator("a").filter({ hasText: "@dev" })).toBeVisible();
  });
});
