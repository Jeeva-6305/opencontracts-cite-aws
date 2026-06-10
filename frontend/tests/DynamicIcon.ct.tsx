import React from "react";
import { test, expect } from "./utils/coverage";
import { DynamicIcon } from "../src/components/widgets/icon-picker/DynamicIcon";
import { docScreenshot } from "./utils/docScreenshot";

test.describe("DynamicIcon", () => {
  test("renders a known SUI icon name (trash)", async ({ mount, page }) => {
    await mount(<DynamicIcon name="trash" size={24} />);
    const svg = page.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("renders a Lucide kebab-case name (file-text)", async ({
    mount,
    page,
  }) => {
    await mount(<DynamicIcon name="file-text" size={24} />);
    const svg = page.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("renders fallback HelpCircle for unknown name", async ({
    mount,
    page,
  }) => {
    await mount(<DynamicIcon name="nonexistent-icon" size={24} />);
    const svg = page.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("applies aria-label and role=img when provided", async ({
    mount,
    page,
  }) => {
    await mount(
      <DynamicIcon name="trash" size={24} aria-label="Delete item" />
    );
    const svg = page.locator('svg[aria-label="Delete item"]');
    await expect(svg).toBeVisible();
    await expect(svg).toHaveAttribute("aria-hidden", "false");
    await expect(svg).toHaveAttribute("role", "img");
  });

  test("defaults to aria-hidden and no role when no aria-label provided", async ({
    mount,
    page,
  }) => {
    await mount(<DynamicIcon name="trash" size={24} />);
    const svg = page.locator("svg");
    await expect(svg).toHaveAttribute("aria-hidden", "true");
    await expect(svg).not.toHaveAttribute("role");
  });

  test("renders gallery of SUI and Lucide icons", async ({ mount, page }) => {
    const iconNames = [
      "trash",
      "edit",
      "check",
      "warning sign",
      "info circle",
      "file-text",
      "arrow-right",
      "help-circle",
      "nonexistent",
    ];

    await mount(
      <div
        style={{
          display: "flex",
          gap: "12px",
          padding: "16px",
          alignItems: "center",
          background: "#fff",
        }}
      >
        {iconNames.map((name) => (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <DynamicIcon name={name} size={24} />
            <span style={{ fontSize: "10px", color: "#666" }}>{name}</span>
          </div>
        ))}
      </div>
    );

    const svgs = page.locator("svg");
    await expect(svgs).toHaveCount(iconNames.length);

    await docScreenshot(page, "icons--dynamic-icon--gallery");
  });
});
