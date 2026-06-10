/**
 * Test wrapper for CamlArticle — pure rendering, no GraphQL.
 *
 * Provides a pre-parsed CamlDocument for testing the renderer tree
 * without network dependencies.
 */
import React from "react";
import { MemoryRouter } from "react-router-dom";
import type { CamlDocument } from "@os-legal/caml";
import { CamlArticle, CamlThemeProvider } from "@os-legal/caml-react";

/**
 * Sample parsed CAML document for test fixtures.
 */
export const SAMPLE_CAML_DOCUMENT: CamlDocument = {
  frontmatter: {
    version: "1.0",
    hero: {
      kicker: "OpenContracts · Corpus Analysis",
      title: ["Understanding the", "{Supply Chain}"],
      subtitle:
        "An interactive exploration of supply chain agreements and their key provisions.",
      stats: ["42 Documents", "1,280 Annotations", "8 Contributors"],
    },
    footer: {
      nav: [
        { label: "Documentation", href: "/docs" },
        { label: "GitHub", href: "https://github.com" },
      ],
      notice: "Published with OpenContracts",
    },
  },
  chapters: [
    {
      id: "overview",
      kicker: "Chapter 1",
      title: "Key Findings",
      blocks: [
        {
          type: "prose",
          content:
            'This corpus contains **42 supply chain agreements** spanning multiple industries.\n\n>>> "The majority of agreements include force majeure clauses that were updated post-2020."',
        },
        {
          type: "cards",
          columns: 2,
          items: [
            {
              label: "Force Majeure",
              meta: "§ 12.1",
              accent: "#0f766e",
              body: "Present in 38 of 42 agreements with pandemic-specific language.",
              footer: "Last updated: Q2 2024",
            },
            {
              label: "Indemnification",
              meta: "§ 8.3",
              accent: "#c4573a",
              body: "Mutual indemnification in 29 agreements; one-sided in 13.",
              footer: "Avg. cap: $2.5M",
            },
            {
              label: "Termination",
              meta: "§ 15.2",
              accent: "#7c3aed",
              body: "30-day notice period standard. 6 agreements allow immediate termination.",
            },
            {
              label: "IP Rights",
              meta: "§ 6.1",
              accent: "#0369a1",
              body: "Ownership retained by licensor in all agreements.",
              footer: "No exceptions found",
            },
          ],
        },
        {
          type: "pills",
          items: [
            {
              bigText: "42",
              label: "Documents",
              detail: "Across 3 jurisdictions",
              status: "Complete",
              statusColor: "#16a34a",
            },
            {
              bigText: "1.2K",
              label: "Annotations",
              detail: "Manual + AI-assisted",
            },
            {
              bigText: "8",
              label: "Contributors",
              status: "Active",
              statusColor: "#0f766e",
            },
          ],
        },
      ],
    },
    {
      id: "analysis",
      theme: "dark",
      gradient: true,
      centered: true,
      kicker: "Chapter 2",
      title: "Deep Analysis",
      blocks: [
        {
          type: "tabs",
          tabs: [
            {
              label: "Risk Assessment",
              status: "High",
              color: "#ef4444",
              sections: [
                {
                  heading: "Key Risks Identified",
                  highlight: true,
                  content:
                    "Supply chain disruption risk is elevated due to single-source dependencies in 15 agreements.",
                },
                {
                  heading: "Mitigation Strategies",
                  content:
                    "Recommend dual-sourcing clauses and quarterly review cycles.",
                },
              ],
              sources: [
                { name: "Agreement-A.pdf" },
                { name: "Agreement-B.pdf" },
              ],
            },
            {
              label: "Compliance",
              status: "OK",
              color: "#16a34a",
              sections: [
                {
                  heading: "Regulatory Alignment",
                  content:
                    "All agreements comply with current regulations. Two require updates for 2025 changes.",
                },
              ],
              sources: [{ name: "Compliance-Report.pdf" }],
            },
          ],
        },
      ],
    },
    {
      id: "timeline-chapter",
      kicker: "Chapter 3",
      title: "Agreement Timeline",
      blocks: [
        {
          type: "timeline",
          legend: [
            { label: "Executed", color: "#16a34a" },
            { label: "Amended", color: "#f59e0b" },
          ],
          items: [
            {
              date: "Jan 2023",
              label: "Master Agreement signed",
              side: "executed",
            },
            {
              date: "Jun 2023",
              label: "Amendment 1 — Force Majeure update",
              side: "amended",
            },
            {
              date: "Dec 2023",
              label: "Annual renewal executed",
              side: "executed",
            },
          ],
        },
        {
          type: "cta",
          items: [
            {
              label: "Explore Documents",
              href: "/documents",
              primary: true,
            },
            { label: "View Source Data", href: "/data" },
          ],
        },
      ],
    },
    {
      id: "jurisdiction",
      kicker: "Chapter 4",
      title: "Jurisdiction Map",
      blocks: [
        {
          type: "map",
          mapType: "us",
          mode: "categorical",
          legend: [
            { label: "Compliant", color: "#0f766e" },
            { label: "Pending", color: "#f59e0b" },
            { label: "Non-compliant", color: "#dc2626" },
          ],
          states: [
            { code: "CA", status: "Compliant" },
            { code: "NY", status: "Compliant", count: 247 },
            { code: "TX", status: "Pending", count: 56 },
            { code: "FL", status: "Non-compliant" },
            { code: "IL", status: "Compliant" },
            { code: "OH", status: "Pending" },
          ],
        },
      ],
    },
    {
      id: "branding",
      kicker: "Chapter 5",
      title: "Corpus Branding",
      blocks: [
        {
          type: "image" as const,
          src: "corpus://icon",
          size: "lg" as const,
          shape: "avatar" as const,
          caption: "Supply Chain Agreements",
        },
        {
          type: "image" as const,
          src: "corpus://current",
          size: "md" as const,
          shape: "rounded" as const,
          caption: "Current corpus badge",
        },
        {
          type: "image" as const,
          src: "https://example.com/logo.png",
          alt: "Partner logo",
          size: "sm" as const,
          shape: "rounded" as const,
        },
      ],
    },
    {
      id: "case-tracker",
      kicker: "Chapter 6",
      title: "Case Tracker",
      blocks: [
        {
          type: "case-history",
          title: "SEC v. Meridian Capital Partners LLC",
          docket: "No. 22-cv-04817 (S.D.N.Y.)",
          status: "Affirmed",
          entries: [
            {
              courtLevel: "District Court",
              courtName: "S.D.N.Y.",
              date: "2022-06-10",
              action: "Motion for TRO",
              outcome: "Granted",
              detail: "Court issued TRO freezing defendant assets.",
            },
            {
              courtLevel: "Court of Appeals",
              courtName: "2nd Circuit",
              date: "2023-11-08",
              action: "Appeal",
              outcome: "Affirmed",
            },
            {
              courtLevel: "Supreme Court",
              courtName: "SCOTUS",
              date: "2024-03-25",
              action: "Certiorari",
              outcome: "Cert Denied",
            },
          ],
        },
      ],
    },
  ],
};

const MOCK_CORPUS_ICON_URL = "https://example.com/corpus-icon.png";

/**
 * Pre-defined resolver strategies. Functions cannot be serialized across the
 * Playwright CT boundary, so we select by a string key instead.
 *
 * - "default" — corpus://icon and corpus://current both map to the mock corpus icon URL.
 * - "none"    — always returns undefined (all corpus:// images show placeholders).
 */
type ResolverMode = "default" | "none";

const RESOLVERS: Record<ResolverMode, (src: string) => string | undefined> = {
  default: (src) => {
    if (src === "corpus://icon" || src === "corpus://current") {
      return MOCK_CORPUS_ICON_URL;
    }
    return undefined;
  },
  none: () => undefined,
};

export interface CamlArticleTestWrapperProps {
  document?: CamlDocument;
  stats?: Record<string, number | undefined>;
  /**
   * Direct resolver function — only usable in non-Playwright-CT contexts.
   * For CT tests, use `resolverMode` instead (functions can't cross the
   * Playwright serialization boundary).
   */
  resolveImageSrc?: (src: string) => string | undefined;
  /** Select a pre-defined image resolver strategy (default: "default"). */
  resolverMode?: ResolverMode;
}

export const CamlArticleTestWrapper: React.FC<CamlArticleTestWrapperProps> = ({
  document: doc = SAMPLE_CAML_DOCUMENT,
  stats,
  resolveImageSrc,
  resolverMode = "default",
}) => {
  const resolver = resolveImageSrc ?? RESOLVERS[resolverMode];
  return (
    <MemoryRouter>
      <div
        style={{ width: "100vw", minHeight: "100vh", background: "#ffffff" }}
        data-testid="caml-article-test-root"
      >
        <CamlThemeProvider>
          <CamlArticle
            document={doc}
            stats={stats}
            resolveImageSrc={resolver}
          />
        </CamlThemeProvider>
      </div>
    </MemoryRouter>
  );
};
