import React from "react";
import { test, expect } from "./utils/coverage";
import { CreateArticlePlaceholderHarness } from "./CreateArticlePlaceholderTestWrapper";
import { docScreenshot } from "./utils/docScreenshot";

test.describe("CreateArticlePlaceholder - Card Mode", () => {
  test("should render card placeholder with title and subtitle", async ({
    mount,
    page,
  }) => {
    await mount(<CreateArticlePlaceholderHarness viewMode="modern-card" />);

    const placeholder = page.getByTestId("create-article-placeholder");
    await expect(placeholder).toBeVisible({ timeout: 5000 });

    await expect(page.getByText("Readme.CAML")).toBeVisible();
    await expect(page.getByText("Create a corpus article")).toBeVisible();

    await docScreenshot(page, "caml--cta--card-placeholder");
  });

  test("should call onClick when card is clicked", async ({ mount, page }) => {
    let clicked = false;
    await mount(
      <CreateArticlePlaceholderHarness
        viewMode="modern-card"
        onClick={() => {
          clicked = true;
        }}
      />
    );

    const placeholder = page.getByTestId("create-article-placeholder");
    await placeholder.click();
    expect(clicked).toBe(true);
  });
});

test.describe("CreateArticlePlaceholder - List Mode", () => {
  test("should render list placeholder with title and subtitle", async ({
    mount,
    page,
  }) => {
    await mount(<CreateArticlePlaceholderHarness viewMode="modern-list" />);

    const placeholder = page.getByTestId("create-article-placeholder");
    await expect(placeholder).toBeVisible({ timeout: 5000 });

    await expect(page.getByText("Readme.CAML")).toBeVisible();
    await expect(page.getByText("Create a corpus article")).toBeVisible();

    await docScreenshot(page, "caml--cta--list-placeholder");
  });
});
