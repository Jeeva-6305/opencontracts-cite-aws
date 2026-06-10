import { test, expect } from "./utils/coverage";
import { BadgeCriteriaConfigTestWrapper } from "./BadgeCriteriaConfigTestWrapper";
import { GET_BADGE_CRITERIA_TYPES } from "../src/graphql/queries";
import { docScreenshot } from "./utils/docScreenshot";

const criteriaMock = {
  request: {
    query: GET_BADGE_CRITERIA_TYPES,
    variables: { scope: "global" },
  },
  result: {
    data: {
      badgeCriteriaTypes: [
        {
          typeId: "annotation_count",
          name: "Annotation Count",
          description: "Award badge when user reaches annotation count",
          scope: "global",
          fields: [
            {
              name: "threshold",
              label: "Threshold",
              fieldType: "number",
              required: true,
              description: "Number of annotations required",
              minValue: 1,
              maxValue: 10000,
              allowedValues: null,
            },
          ],
          implemented: true,
        },
        {
          typeId: "message_quality",
          name: "Message Quality",
          description: "Award badge for high-quality messages",
          scope: "global",
          fields: [
            {
              name: "quality_level",
              label: "Quality Level",
              fieldType: "text",
              required: true,
              description: "Minimum quality level required",
              minValue: null,
              maxValue: null,
              allowedValues: ["basic", "good", "excellent"],
            },
            {
              name: "require_approval",
              label: "Require Approval",
              fieldType: "boolean",
              required: false,
              description: "Whether manual approval is needed",
              minValue: null,
              maxValue: null,
              allowedValues: null,
            },
          ],
          implemented: true,
        },
      ],
    },
  },
};

// Create independent mock copies for refetches
const createCriteriaMock = () => ({
  request: {
    query: GET_BADGE_CRITERIA_TYPES,
    variables: { scope: "global" },
  },
  result: {
    ...criteriaMock.result,
  },
});

test.describe("BadgeCriteriaConfig", () => {
  test("renders criteria type dropdown with placeholder", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <BadgeCriteriaConfigTestWrapper
        mocks={[createCriteriaMock(), createCriteriaMock()]}
      />
    );

    // Wait for loading to finish and dropdown to appear
    await expect(page.locator(".oc-dropdown__placeholder")).toBeVisible({
      timeout: 10000,
    });

    await expect(
      page.locator(".oc-dropdown__placeholder").first()
    ).toContainText("Select criteria type");

    await docScreenshot(page, "badges--criteria-config--initial");

    await component.unmount();
  });

  test("shows criteria types after loading", async ({ mount, page }) => {
    const component = await mount(
      <BadgeCriteriaConfigTestWrapper
        mocks={[createCriteriaMock(), createCriteriaMock()]}
      />
    );

    // Wait for dropdown to be ready
    await expect(page.locator(".oc-dropdown__trigger").first()).toBeVisible({
      timeout: 10000,
    });

    // Click the dropdown trigger to open the menu
    await page.locator(".oc-dropdown__trigger").first().click();

    // Verify options are visible (use option-label to avoid matching descriptions)
    await expect(page.locator(".oc-dropdown__option").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator(".oc-dropdown__option-label", {
        hasText: "Annotation Count",
      })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator(".oc-dropdown__option-label", { hasText: "Message Quality" })
    ).toBeVisible({ timeout: 10000 });

    await component.unmount();
  });

  test("selecting criteria type shows field inputs", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <BadgeCriteriaConfigTestWrapper
        mocks={[createCriteriaMock(), createCriteriaMock()]}
      />
    );

    // Wait for dropdown
    await expect(page.locator(".oc-dropdown__trigger").first()).toBeVisible({
      timeout: 10000,
    });

    // Open and select "Message Quality" (has multiple field types)
    await page.locator(".oc-dropdown__trigger").first().click();
    await page
      .locator(".oc-dropdown__option-label", { hasText: "Message Quality" })
      .click();

    // Wait for field inputs to render (use label tags to avoid multiple matches)
    await expect(
      page.locator("label", { hasText: "Quality Level" })
    ).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator("label", { hasText: "Require Approval" })
    ).toBeVisible({
      timeout: 10000,
    });

    // Quality Level field should have a dropdown (since it has allowedValues)
    // Require Approval field should have a boolean dropdown
    const dropdowns = page.locator(".oc-dropdown__trigger");
    // Should have at least 3: criteria type + quality_level + require_approval
    await expect(dropdowns.nth(1)).toBeVisible({ timeout: 10000 });
    await expect(dropdowns.nth(2)).toBeVisible({ timeout: 10000 });

    await docScreenshot(page, "badges--criteria-config--with-type-selected");

    await component.unmount();
  });

  test("selecting annotation count shows number input", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <BadgeCriteriaConfigTestWrapper
        mocks={[createCriteriaMock(), createCriteriaMock()]}
      />
    );

    // Wait for dropdown
    await expect(page.locator(".oc-dropdown__trigger").first()).toBeVisible({
      timeout: 10000,
    });

    // Open and select "Annotation Count"
    await page.locator(".oc-dropdown__trigger").first().click();
    await page
      .locator(".oc-dropdown__option-label", { hasText: "Annotation Count" })
      .click();

    // Should show threshold field with number input
    await expect(page.locator("label", { hasText: "Threshold" })).toBeVisible({
      timeout: 10000,
    });

    // Should have an input for threshold (may be text or number type)
    const inputs = page
      .locator("input")
      .filter({ hasNot: page.locator('[type="hidden"]') });
    await expect(inputs.first()).toBeVisible({
      timeout: 10000,
    });

    await component.unmount();
  });
});
