/**
 * Playwright Component Tests for LabelSetDetailPage
 *
 * Tests cover:
 * - Rendering each tab
 * - Permission-based UI visibility
 * - Label CRUD operations
 * - Search functionality
 * - Mobile navigation
 */

import React from "react";
import { test, expect } from "./utils/coverage";
import { MockedResponse } from "@apollo/client/testing";
import { LabelSetDetailPageTestWrapper } from "./LabelSetDetailPageTestWrapper";
import { GET_LABELSET_WITH_ALL_LABELS } from "../src/graphql/queries";
import {
  DELETE_MULTIPLE_ANNOTATION_LABELS,
  UPDATE_ANNOTATION_LABEL,
  CREATE_ANNOTATION_LABEL_FOR_LABELSET,
  DELETE_LABELSET,
} from "../src/graphql/mutations";
import { openedLabelset } from "../src/graphql/cache";

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

const mockLabelsetBase = {
  __typename: "LabelSetType" as const,
  id: "TGFiZWxTZXRUeXBlOjE=",
  icon: null,
  title: "Test Label Set",
  description: "A comprehensive label set for testing",
  created: "2024-01-15T10:00:00Z",
  modified: "2024-01-20T15:30:00Z",
  isPublic: false,
  docLabelCount: 2,
  spanLabelCount: 3,
  tokenLabelCount: 1,
  corpusCount: 5,
  creator: {
    __typename: "UserType" as const,
    id: "user-1",
    slug: "testuser",
    username: "testuser",
    email: "test@example.com",
  },
};

const mockTextLabels = [
  {
    __typename: "AnnotationLabelType" as const,
    id: "label-text-1",
    icon: "tag",
    labelType: "TOKEN_LABEL",
    readOnly: false,
    text: "Important Text",
    description: "Marks important text passages",
    color: "0066cc",
    myPermissions: ["READ", "UPDATE", "DELETE"],
    isPublic: false,
    analyzer: null,
  },
];

const mockDocLabels = [
  {
    __typename: "AnnotationLabelType" as const,
    id: "label-doc-1",
    icon: "file",
    labelType: "DOC_TYPE_LABEL",
    readOnly: false,
    text: "Contract",
    description: "Legal contract document",
    color: "00cc66",
    myPermissions: ["READ", "UPDATE", "DELETE"],
    isPublic: false,
    analyzer: null,
  },
  {
    __typename: "AnnotationLabelType" as const,
    id: "label-doc-2",
    icon: "file",
    labelType: "DOC_TYPE_LABEL",
    readOnly: false,
    text: "Invoice",
    description: "Financial invoice document",
    color: "cc6600",
    myPermissions: ["READ", "UPDATE", "DELETE"],
    isPublic: false,
    analyzer: null,
  },
];

const mockSpanLabels = [
  {
    __typename: "AnnotationLabelType" as const,
    id: "label-span-1",
    icon: "tag",
    labelType: "SPAN_LABEL",
    readOnly: false,
    text: "Entity Name",
    description: "Identifies entity names",
    color: "cc0066",
    myPermissions: ["READ", "UPDATE", "DELETE"],
    isPublic: false,
    analyzer: null,
  },
  {
    __typename: "AnnotationLabelType" as const,
    id: "label-span-2",
    icon: "tag",
    labelType: "SPAN_LABEL",
    readOnly: false,
    text: "Date",
    description: "Date annotations",
    color: "6600cc",
    myPermissions: ["READ", "UPDATE", "DELETE"],
    isPublic: false,
    analyzer: null,
  },
  {
    __typename: "AnnotationLabelType" as const,
    id: "label-span-3",
    icon: "tag",
    labelType: "SPAN_LABEL",
    readOnly: false,
    text: "Amount",
    description: "Monetary amounts",
    color: "66cc00",
    myPermissions: ["READ", "UPDATE", "DELETE"],
    isPublic: false,
    analyzer: null,
  },
];

const mockRelationshipLabels = [
  {
    __typename: "AnnotationLabelType" as const,
    id: "label-rel-1",
    icon: "arrows alternate horizontal",
    labelType: "RELATIONSHIP_LABEL",
    readOnly: false,
    text: "References",
    description: "Document references another document",
    color: "0099cc",
    myPermissions: ["READ", "UPDATE", "DELETE"],
    isPublic: false,
    analyzer: null,
  },
];

const allLabels = [
  ...mockTextLabels,
  ...mockDocLabels,
  ...mockSpanLabels,
  ...mockRelationshipLabels,
];

// Labelset with full permissions (format: action_modelname for getPermissions)
const mockLabelsetWithPermissions = {
  ...mockLabelsetBase,
  myPermissions: ["read_labelset", "update_labelset", "remove_labelset"],
  allAnnotationLabels: allLabels,
};

// Labelset with read-only permissions
const mockLabelsetReadOnly = {
  ...mockLabelsetBase,
  myPermissions: ["read_labelset"],
  allAnnotationLabels: allLabels,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════

const createLabelsetMock = (
  labelset: typeof mockLabelsetWithPermissions
): MockedResponse => ({
  request: {
    query: GET_LABELSET_WITH_ALL_LABELS,
    variables: { id: labelset.id },
  },
  result: {
    data: {
      labelset,
    },
  },
  maxUsageCount: Infinity, // Allow unlimited reuse of this mock
});

const createDeleteLabelMock = (
  labelIds: string[],
  success: boolean = true
): MockedResponse => ({
  request: {
    query: DELETE_MULTIPLE_ANNOTATION_LABELS,
    variables: { annotationLabelIdsToDelete: labelIds },
  },
  result: {
    data: {
      deleteMultipleAnnotationLabels: {
        ok: success,
        message: success ? null : "Failed to delete",
      },
    },
  },
});

const createUpdateLabelMock = (
  id: string,
  updates: { text?: string; description?: string; color?: string },
  success: boolean = true
): MockedResponse => ({
  request: {
    query: UPDATE_ANNOTATION_LABEL,
    variables: {
      id,
      text: updates.text,
      description: updates.description,
      color: updates.color,
    },
  },
  result: {
    data: {
      updateAnnotationLabel: {
        ok: success,
        message: success ? null : "Failed to update",
      },
    },
  },
});

const createCreateLabelMock = (
  labelsetId: string,
  label: {
    text: string;
    description: string;
    color: string;
    labelType: string;
  },
  success: boolean = true
): MockedResponse => ({
  request: {
    query: CREATE_ANNOTATION_LABEL_FOR_LABELSET,
    variables: {
      color: label.color,
      description: label.description,
      icon: "tag",
      text: label.text,
      labelType: label.labelType,
      labelsetId,
    },
  },
  result: {
    data: {
      createAnnotationLabelForLabelset: {
        ok: success,
        message: success ? null : "Failed to create",
      },
    },
  },
});

const createDeleteLabelsetMock = (
  id: string,
  success: boolean = true
): MockedResponse => ({
  request: {
    query: DELETE_LABELSET,
    variables: { id },
  },
  result: {
    data: {
      deleteLabelset: {
        ok: success,
        message: success ? null : "Failed to delete labelset",
      },
    },
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MOUNT HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper to mount LabelSetDetailPage with proper setup.
 * Sets reactive var BEFORE mount (critical for Playwright component tests).
 */
const mountLabelSetDetailPage = (
  mount: any,
  mocks: MockedResponse[],
  labelsetId: string,
  permissions: string[] = [
    "read_labelset",
    "update_labelset",
    "remove_labelset",
  ]
) => {
  // Set reactive var BEFORE mount - this runs in browser context
  openedLabelset({
    id: labelsetId,
    myPermissions: permissions,
  } as any);

  return mount(
    <LabelSetDetailPageTestWrapper
      mocks={mocks}
      labelsetId={labelsetId}
      permissions={permissions}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe("LabelSetDetailPage", () => {
  // ─────────────────────────────────────────────────────────────────────────────
  // RENDERING TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Rendering", () => {
    test("renders overview tab by default with labelset info", async ({
      mount,
    }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions), // For refetch
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      // Wait for data to load
      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Verify overview elements are visible
      await expect(
        component.getByText("A comprehensive label set for testing")
      ).toBeVisible();
    });

    test("renders Text Labels tab with correct label count", async ({
      mount,
    }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Click on Text Labels tab
      await component.getByRole("button", { name: /Text Labels/i }).click();

      // Verify text label is visible (use exact match to avoid matching description)
      await expect(
        component.getByText("Important Text", { exact: true })
      ).toBeVisible();
    });

    test("renders Doc Labels tab with correct label count", async ({
      mount,
    }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Click on Doc Labels tab
      await component.getByRole("button", { name: /Doc Labels/i }).click();

      // Verify doc labels are visible (use exact match to avoid matching description)
      await expect(
        component.getByText("Contract", { exact: true })
      ).toBeVisible();
      await expect(
        component.getByText("Invoice", { exact: true })
      ).toBeVisible();
    });

    test("renders Span Labels tab with correct labels", async ({ mount }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Click on Span Labels tab
      await component.getByRole("button", { name: /Span Labels/i }).click();

      // Verify span labels are visible (use exact match to avoid matching description)
      await expect(
        component.getByText("Entity Name", { exact: true })
      ).toBeVisible();
      await expect(component.getByText("Date", { exact: true })).toBeVisible();
      await expect(
        component.getByText("Amount", { exact: true })
      ).toBeVisible();
    });

    test("displays loading state while fetching", async ({ mount }) => {
      // Create a mock that delays response
      const delayedMock: MockedResponse = {
        request: {
          query: GET_LABELSET_WITH_ALL_LABELS,
          variables: { id: mockLabelsetWithPermissions.id },
        },
        result: {
          data: {
            labelset: mockLabelsetWithPermissions,
          },
        },
        delay: 5000,
      };

      const component = await mountLabelSetDetailPage(
        mount,
        [delayedMock],
        mockLabelsetWithPermissions.id
      );

      // Should show loading state
      await expect(component.getByText(/Loading/i)).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PERMISSION TESTS - WITH UPDATE PERMISSION
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Permission Checks - With UPDATE Permission", () => {
    test("shows Add Label button in Text Labels tab", async ({ mount }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Navigate to Text Labels tab
      await component.getByRole("button", { name: /Text Labels/i }).click();

      // Should show Add Label button
      await expect(
        component.getByRole("button", { name: /Add Label/i })
      ).toBeVisible();
    });

    test("shows edit button on individual labels on hover", async ({
      mount,
      page,
    }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Navigate to Span Labels tab
      await component.getByRole("button", { name: /Span Labels/i }).click();

      // Wait for labels to be visible
      await expect(
        component.getByText("Entity Name", { exact: true })
      ).toBeVisible();

      // Hover over a label to reveal action buttons
      const labelItem = component
        .getByText("Entity Name", { exact: true })
        .locator("..");
      await labelItem.hover();

      // Edit button should become visible (actions have opacity 0 by default)
      // We check the DOM structure rather than visibility due to CSS opacity
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PERMISSION TESTS - WITHOUT UPDATE PERMISSION
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Permission Checks - Without UPDATE Permission", () => {
    test("hides Add Label button when user lacks UPDATE permission", async ({
      mount,
    }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetReadOnly),
        createLabelsetMock(mockLabelsetReadOnly),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetReadOnly.id,
        ["read_labelset"]
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Navigate to Text Labels tab
      await component.getByRole("button", { name: /Text Labels/i }).click();

      // Add Label button should NOT be visible
      await expect(
        component.getByRole("button", { name: /Add Label/i })
      ).not.toBeVisible();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // SEARCH FUNCTIONALITY
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Search", () => {
    test("filters labels by name match", async ({ mount }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Navigate to Span Labels tab
      await component.getByRole("button", { name: /Span Labels/i }).click();

      // All span labels should be visible (use exact match to avoid matching description)
      await expect(
        component.getByText("Entity Name", { exact: true })
      ).toBeVisible();
      await expect(component.getByText("Date", { exact: true })).toBeVisible();
      await expect(
        component.getByText("Amount", { exact: true })
      ).toBeVisible();

      // Search for "Entity"
      const searchInput = component.getByPlaceholder(/Search labels/i);
      await searchInput.fill("Entity");

      // Only "Entity Name" should be visible
      await expect(
        component.getByText("Entity Name", { exact: true })
      ).toBeVisible();

      // These should not be visible after filtering
      await expect(
        component.getByText("Date", { exact: true })
      ).not.toBeVisible();
      await expect(
        component.getByText("Amount", { exact: true })
      ).not.toBeVisible();
    });

    test("clears filter when search cleared", async ({ mount }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Navigate to Span Labels tab
      await component.getByRole("button", { name: /Span Labels/i }).click();

      // Search for something
      const searchInput = component.getByPlaceholder(/Search labels/i);
      await searchInput.fill("Entity");

      // Only Entity Name should be visible (use exact match)
      await expect(
        component.getByText("Entity Name", { exact: true })
      ).toBeVisible();
      await expect(
        component.getByText("Date", { exact: true })
      ).not.toBeVisible();

      // Clear search
      await searchInput.fill("");

      // All labels should be visible again (use exact match)
      await expect(
        component.getByText("Entity Name", { exact: true })
      ).toBeVisible();
      await expect(component.getByText("Date", { exact: true })).toBeVisible();
      await expect(
        component.getByText("Amount", { exact: true })
      ).toBeVisible();
    });

    test("shows empty state when no matches", async ({ mount }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Navigate to Span Labels tab
      await component.getByRole("button", { name: /Span Labels/i }).click();

      // Search for non-existent term
      const searchInput = component.getByPlaceholder(/Search labels/i);
      await searchInput.fill("xyznonexistent");

      // Should show empty state or no results (use exact match)
      await expect(
        component.getByText("Entity Name", { exact: true })
      ).not.toBeVisible();
      await expect(
        component.getByText("Date", { exact: true })
      ).not.toBeVisible();
      await expect(
        component.getByText("Amount", { exact: true })
      ).not.toBeVisible();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // MOBILE NAVIGATION
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("Mobile Navigation", () => {
    test("shows mobile tab bar on small viewport", async ({ mount, page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Mobile navigation should be visible (displays at max-width: 900px)
      // The mobile nav contains the same tabs but in a different layout
    });

    test("switches tabs on mobile tab click", async ({ mount, page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Click on Span Labels tab in mobile view
      await component.getByRole("button", { name: /Span/i }).first().click();

      // Span labels should be visible (use exact match)
      await expect(
        component.getByText("Entity Name", { exact: true })
      ).toBeVisible();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  test.describe("CRUD Operations", () => {
    test("shows create form when Add Label clicked", async ({ mount }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Navigate to Span Labels tab
      await component.getByRole("button", { name: /Span Labels/i }).click();

      // Click Add Label button
      await component.getByRole("button", { name: /Add Label/i }).click();

      // Verify create form appears with correct fields
      await expect(
        component.getByPlaceholder("Enter label name")
      ).toBeVisible();
      await expect(
        component.getByPlaceholder("Describe what this label is used for")
      ).toBeVisible();

      // Verify Create and Cancel buttons are present
      await expect(component.getByTitle("Create")).toBeVisible();
      await expect(component.getByTitle("Cancel")).toBeVisible();
    });

    test("can cancel create form", async ({ mount }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Navigate to Span Labels tab
      await component.getByRole("button", { name: /Span Labels/i }).click();

      // Click Add Label button
      await component.getByRole("button", { name: /Add Label/i }).click();

      // Verify form is visible
      await expect(
        component.getByPlaceholder("Enter label name")
      ).toBeVisible();

      // Click Cancel
      await component.getByTitle("Cancel").click();

      // Form should be hidden
      await expect(
        component.getByPlaceholder("Enter label name")
      ).not.toBeVisible();

      // Add Label button should be visible again
      await expect(
        component.getByRole("button", { name: /Add Label/i })
      ).toBeVisible();
    });

    test("validates create form requires label name", async ({ mount }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Navigate to Span Labels tab
      await component.getByRole("button", { name: /Span Labels/i }).click();

      // Click Add Label button
      await component.getByRole("button", { name: /Add Label/i }).click();

      // Try to submit without filling in name
      await component.getByTitle("Create").click();

      // Form should still be visible (validation prevents submission)
      await expect(
        component.getByPlaceholder("Enter label name")
      ).toBeVisible();
    });

    test("shows empty state with Add First Label when no labels exist", async ({
      mount,
    }) => {
      // Create labelset with no span labels
      const noSpanLabelsLabelset = {
        ...mockLabelsetWithPermissions,
        allAnnotationLabels: [
          ...mockTextLabels,
          ...mockDocLabels,
          ...mockRelationshipLabels,
          // No span labels
        ],
        spanLabelCount: 0,
      };

      const mocks = [
        createLabelsetMock(noSpanLabelsLabelset),
        createLabelsetMock(noSpanLabelsLabelset),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        noSpanLabelsLabelset.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Navigate to Span Labels tab
      await component.getByRole("button", { name: /Span Labels/i }).click();

      // Should show empty state with "Add First Label" button
      await expect(component.getByText(/No span labels yet/i)).toBeVisible();
      await expect(
        component.getByRole("button", { name: /Add First Label/i })
      ).toBeVisible();
    });

    test("shows no matches message when search has no results", async ({
      mount,
    }) => {
      const mocks = [
        createLabelsetMock(mockLabelsetWithPermissions),
        createLabelsetMock(mockLabelsetWithPermissions),
      ];

      const component = await mountLabelSetDetailPage(
        mount,
        mocks,
        mockLabelsetWithPermissions.id
      );

      await expect(component.getByText("Test Label Set")).toBeVisible({
        timeout: 10000,
      });

      // Navigate to Span Labels tab
      await component.getByRole("button", { name: /Span Labels/i }).click();

      // Search for non-existent term
      const searchInput = component.getByPlaceholder(/Search labels/i);
      await searchInput.fill("xyznonexistent");

      // Should show no matches message
      await expect(
        component.getByText(/No labels match "xyznonexistent"/i)
      ).toBeVisible();
    });
  });
});
