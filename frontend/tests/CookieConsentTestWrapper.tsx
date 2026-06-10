import React from "react";
import { CookieConsentDialog } from "../src/components/cookies/CookieConsent";

/**
 * Test wrapper for CookieConsentDialog.
 *
 * The Playwright CT hook (playwright/index.tsx) already provides
 * JotaiProvider, ApolloProvider, ThemeProvider, and allStyles injection,
 * so we only need a minimal wrapper here.
 */
export const CookieConsentHarness: React.FC = () => {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#f5f5f5",
      }}
      data-testid="harness-root"
    >
      <CookieConsentDialog />
    </div>
  );
};
