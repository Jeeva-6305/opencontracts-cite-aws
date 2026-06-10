// Playwright Component Test for SelectExportTypeModal
//
// Tests the export configuration modal with OS-Legal styling.
// Note: The exportingCorpus reactive var is not set in these tests since
// it requires browser-context initialization. The modal shows "corpus"
// as default subtitle. Integration with the reactive var is tested
// via the Corpuses view tests.
import React from "react";
import { test, expect } from "./utils/coverage";
import { MockedProvider } from "@apollo/client/testing";
import { SelectExportTypeModal } from "../src/components/widgets/modals/SelectExportTypeModal";
import { GET_POST_PROCESSORS } from "../src/graphql/queries";
import { docScreenshot } from "./utils/docScreenshot";

// GraphQL mocks - include duplicates for refetches
const postProcessorsMock = {
  request: {
    query: GET_POST_PROCESSORS,
  },
  result: {
    data: {
      pipelineComponents: {
        postProcessors: [
          {
            name: "SummaryPostProcessor",
            moduleName:
              "opencontractserver.pipeline.postprocessors.SummaryPostProcessor",
            title: "Summary Generator",
            description: "Generates summaries for exported documents",
            author: "OpenContracts",
            componentType: "post_processor",
            inputSchema: {
              maxLength: {
                type: "integer",
                title: "Max Length",
                default: 500,
              },
              includeMetadata: {
                type: "boolean",
                title: "Include Metadata",
                default: true,
              },
            },
          },
          {
            name: "FormatConverter",
            moduleName:
              "opencontractserver.pipeline.postprocessors.FormatConverter",
            title: "Format Converter",
            description: "Converts export to alternative format",
            author: "OpenContracts",
            componentType: "post_processor",
            inputSchema: null,
          },
        ],
      },
    },
  },
};

const emptyPostProcessorsMock = {
  request: {
    query: GET_POST_PROCESSORS,
  },
  result: {
    data: {
      pipelineComponents: {
        postProcessors: [],
      },
    },
  },
};

test.describe("SelectExportTypeModal - Default State", () => {
  test("should render modal with header and format options", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <MockedProvider
        mocks={[postProcessorsMock, postProcessorsMock]}
        addTypename={false}
      >
        <SelectExportTypeModal open={true} onClose={() => {}} />
      </MockedProvider>
    );

    // Check header is visible
    await expect(page.locator("text=Export Corpus")).toBeVisible();

    // Check format options are visible
    await expect(page.locator("text=OpenContracts")).toBeVisible();
    await expect(page.locator("text=FUNSD")).toBeVisible();

    // Check section titles
    await expect(page.locator("text=Export Format")).toBeVisible();
    await expect(page.locator("text=Post-Processing Options")).toBeVisible();

    // Check buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Start Export")')).toBeVisible();

    // Take screenshot for docs
    await docScreenshot(page, "export--config-modal--default");

    await component.unmount();
  });

  test("should have OpenContracts format selected by default", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <MockedProvider
        mocks={[postProcessorsMock, postProcessorsMock]}
        addTypename={false}
      >
        <SelectExportTypeModal open={true} onClose={() => {}} />
      </MockedProvider>
    );

    // OpenContracts format option should be selected
    const ocOption = page.locator('[data-testid="format-open-contracts"]');
    await expect(ocOption).toBeVisible();

    // The description should be visible
    await expect(
      page.locator("text=Complete archive with annotated PDFs and metadata")
    ).toBeVisible();

    await component.unmount();
  });

  test("should allow switching to FUNSD format", async ({ mount, page }) => {
    const component = await mount(
      <MockedProvider
        mocks={[postProcessorsMock, postProcessorsMock]}
        addTypename={false}
      >
        <SelectExportTypeModal open={true} onClose={() => {}} />
      </MockedProvider>
    );

    // Click FUNSD option
    const funsdOption = page.locator('[data-testid="format-funsd"]');
    await funsdOption.click();

    // Take screenshot of FUNSD selected state
    await docScreenshot(page, "export--config-modal--funsd-selected");

    await component.unmount();
  });
});

test.describe("SelectExportTypeModal - Actions", () => {
  test("should call onClose when cancel clicked", async ({ mount, page }) => {
    let closed = false;

    const component = await mount(
      <MockedProvider
        mocks={[postProcessorsMock, postProcessorsMock]}
        addTypename={false}
      >
        <SelectExportTypeModal
          open={true}
          onClose={() => {
            closed = true;
          }}
        />
      </MockedProvider>
    );

    await page.locator('button:has-text("Cancel")').click();
    expect(closed).toBe(true);

    await component.unmount();
  });

  test("should not render when open is false", async ({ mount, page }) => {
    const component = await mount(
      <MockedProvider mocks={[postProcessorsMock]} addTypename={false}>
        <SelectExportTypeModal open={false} onClose={() => {}} />
      </MockedProvider>
    );

    // Modal content should not be visible
    await expect(page.locator("text=Export Corpus")).not.toBeVisible();

    await component.unmount();
  });
});

test.describe("SelectExportTypeModal - Post-Processors", () => {
  test("should show post-processor dropdown", async ({ mount, page }) => {
    const component = await mount(
      <MockedProvider
        mocks={[postProcessorsMock, postProcessorsMock]}
        addTypename={false}
      >
        <SelectExportTypeModal open={true} onClose={() => {}} />
      </MockedProvider>
    );

    // Wait for post-processors to load
    await page.waitForTimeout(500);

    // The dropdown placeholder should be visible
    await expect(page.locator("text=Select post-processors...")).toBeVisible();

    await component.unmount();
  });

  test("should show empty dropdown when no post-processors available", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <MockedProvider
        mocks={[emptyPostProcessorsMock, emptyPostProcessorsMock]}
        addTypename={false}
      >
        <SelectExportTypeModal open={true} onClose={() => {}} />
      </MockedProvider>
    );

    // Wait for load
    await page.waitForTimeout(500);

    // Dropdown should still be present
    await expect(page.locator("text=Select post-processors...")).toBeVisible();

    await component.unmount();
  });
});

test.describe("SelectExportTypeModal - RJSF Form Styling", () => {
  test("should render styled RJSF form when post-processor with schema is selected", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <MockedProvider
        mocks={[postProcessorsMock, postProcessorsMock]}
        addTypename={false}
      >
        <SelectExportTypeModal open={true} onClose={() => {}} />
      </MockedProvider>
    );

    // Wait for post-processors to load
    await expect(page.locator("text=Select post-processors...")).toBeVisible({
      timeout: 5000,
    });

    // Click the dropdown to open it
    await page.locator("text=Select post-processors...").click();

    // Select the SummaryPostProcessor (has inputSchema with maxLength + includeMetadata)
    await page.getByRole("option", { name: "SummaryPostProcessor" }).click();

    // Close the dropdown by clicking outside it
    await page.locator("text=Post-Processing Options").click();

    // The RJSF form should now render with Max Length and Include Metadata fields
    await expect(page.locator("text=Summary Generator Inputs")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator("label:has-text('Max Length')")).toBeVisible();
    await expect(
      page.locator("label:has-text('Include Metadata')")
    ).toBeVisible();

    await docScreenshot(page, "export--config-modal--rjsf-processor-form");

    // Skip unmount: RJSF Form's internal <fieldset id="root"> conflicts
    // with Playwright CT's #root container, causing ambiguous locator.
    // The Form now uses a custom id prop to avoid this in production.
  });
});

test.describe("SelectExportTypeModal - Mobile Responsiveness", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test("should display correctly on mobile viewport", async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <MockedProvider
        mocks={[postProcessorsMock, postProcessorsMock]}
        addTypename={false}
      >
        <SelectExportTypeModal open={true} onClose={() => {}} />
      </MockedProvider>
    );

    // Modal should be visible
    await expect(page.locator("text=Export Corpus")).toBeVisible();

    // Format options should be visible
    await expect(page.locator("text=OpenContracts")).toBeVisible();
    await expect(page.locator("text=FUNSD")).toBeVisible();

    // Buttons should be present
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Start Export")')).toBeVisible();

    // Screenshot for mobile documentation
    await docScreenshot(page, "export--config-modal--mobile");

    await component.unmount();
  });
});
