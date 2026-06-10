# Frontend Analytics

OpenContracts frontend uses PostHog for optional, consent-based analytics tracking. This helps understand how users interact with the interface to improve the experience.

## Privacy-First Design

Frontend analytics is designed with privacy as a priority:

1. **Consent required** — Analytics only activates after explicit user consent via the cookie consent dialog
2. **Do Not Track respected** — The browser's DNT setting is honored
3. **No autocapture** — We don't automatically capture clicks or form submissions
4. **CI/test detection** — Analytics is automatically disabled in test environments

## What We Collect

When enabled and consented, the frontend can track:

| Event Type | Description |
|------------|-------------|
| Page views | Navigation between pages (manually triggered for SPA) |
| Custom events | Feature usage statistics (opt-in per feature) |

## What We Do NOT Collect

- Document contents or extracted data
- User credentials or personal information
- Form inputs or search queries
- Automatic click tracking (autocapture is disabled)

## Configuration

Frontend analytics is configured in `frontend/public/env-config.js`:

```javascript
window._env_ = {
  // ... other settings ...
  REACT_APP_POSTHOG_API_KEY: "your-api-key-here",
  REACT_APP_POSTHOG_HOST: "https://us.i.posthog.com",
};
```

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_POSTHOG_API_KEY` | (empty) | PostHog project API key |
| `REACT_APP_POSTHOG_HOST` | `https://us.i.posthog.com` | PostHog API endpoint |

## Disabling Analytics

To disable frontend analytics entirely, leave `REACT_APP_POSTHOG_API_KEY` empty or unset:

```javascript
window._env_ = {
  // ... other settings ...
  REACT_APP_POSTHOG_API_KEY: "",  // Empty = disabled
  REACT_APP_POSTHOG_HOST: "https://us.i.posthog.com",
};
```

When disabled:
- The cookie consent dialog won't mention analytics
- No PostHog scripts are initialized
- No data is sent to any analytics service

## User Controls

Even when analytics is configured, users have control:

1. **Cookie consent** — Users must accept cookies to enable analytics
2. **Browser DNT** — Do Not Track browser setting is respected
3. **Opt-out** — Users can clear consent via browser localStorage

## Technical Details

- **Location**: `frontend/src/utils/analytics.ts`
- **Consent storage**: `localStorage` key `oc_analyticsConsent`
- **Initialization**: Lazy — only when consent is given and API key is configured

### Available Functions

```typescript
import {
  initializePostHog,      // Initialize PostHog (called automatically on consent)
  shutdownPostHog,        // Shutdown and clear data
  hasAnalyticsConsent,    // Check if user consented
  setAnalyticsConsent,    // Set consent status
  isPostHogConfigured,    // Check if API key is set
  identifyUser,           // Associate events with user
  trackEvent,             // Track custom event
  trackPageView,          // Track page navigation
  resetAnalytics,         // Reset identity (e.g., on logout)
} from "./utils/analytics";
```

### Example Usage

```typescript
// Track a custom event
trackEvent("feature_used", { feature_name: "document_export" });

// Track a page view
trackPageView("/documents/123");

// Identify user after login
identifyUser(userId, { plan: "enterprise" });

// Reset on logout
resetAnalytics();
```

## Test Environment Detection

Analytics is automatically disabled when:

- Running in Playwright or Cypress test environments
- `import.meta.env.MODE === "test"` or `import.meta.env.VITEST` is set
- Hostname includes "test" or "ci-"
- `window._env_.CI === "true"`

This ensures no test data pollutes production analytics.
