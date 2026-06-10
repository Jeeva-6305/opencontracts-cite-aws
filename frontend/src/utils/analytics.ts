/**
 * PostHog Analytics Integration
 *
 * This module provides consent-based PostHog analytics tracking.
 * PostHog is only initialized when the user has given consent.
 */

import posthog from "posthog-js";
import { getRuntimeEnv } from "./env";

// Local storage key for analytics consent
const ANALYTICS_CONSENT_KEY = "oc_analyticsConsent";

/**
 * Check if we're running in a CI/CD or test environment
 * Analytics should never fire in these environments
 */
function isTestOrCIEnvironment(): boolean {
  if (typeof window === "undefined") return true;

  // Check for Playwright/Cypress test environments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).Playwright || (window as any).Cypress) return true;

  // Check for common CI environment indicators in the URL or hostname
  const hostname = window.location?.hostname || "";
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.includes("test") ||
    hostname.includes("ci-")
  ) {
    // Allow localhost in development, but check for test mode
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metaEnv = (import.meta as any)?.env ?? {};
    if (metaEnv.MODE === "test" || metaEnv.VITEST) return true;
  }

  // Check for CI environment variable that might be injected
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const winEnv = (window as any)._env_ || {};
  if (winEnv.CI === "true" || winEnv.REACT_APP_CI === "true") return true;

  return false;
}

/**
 * Check if analytics consent has been given
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ANALYTICS_CONSENT_KEY) === "true";
}

/**
 * Set analytics consent status
 */
export function setAnalyticsConsent(consented: boolean): void {
  if (typeof window === "undefined") return;

  if (consented) {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, "true");
    initializePostHog();
  } else {
    localStorage.removeItem(ANALYTICS_CONSENT_KEY);
    shutdownPostHog();
  }
}

/**
 * Check if PostHog is configured (API key is set)
 * Returns false in CI/test environments even if API key is set
 */
export function isPostHogConfigured(): boolean {
  // Never show as configured in CI/test environments
  if (isTestOrCIEnvironment()) return false;

  const { REACT_APP_POSTHOG_API_KEY } = getRuntimeEnv();
  return Boolean(REACT_APP_POSTHOG_API_KEY);
}

/**
 * Initialize PostHog with consent-based tracking
 * Only initializes if:
 * 1. Not in CI/CD or test environment
 * 2. PostHog API key is configured
 * 3. User has given analytics consent
 */
export function initializePostHog(): void {
  // Never initialize in CI/CD or test environments
  if (isTestOrCIEnvironment()) {
    console.debug(
      "[Analytics] PostHog disabled - CI/test environment detected"
    );
    return;
  }

  const { REACT_APP_POSTHOG_API_KEY, REACT_APP_POSTHOG_HOST } = getRuntimeEnv();

  // Don't initialize if no API key configured
  if (!REACT_APP_POSTHOG_API_KEY) {
    console.debug("[Analytics] PostHog not configured - no API key provided");
    return;
  }

  // Don't initialize if no consent
  if (!hasAnalyticsConsent()) {
    console.debug("[Analytics] PostHog not initialized - no consent");
    return;
  }

  // Don't re-initialize if already initialized
  if (posthog.__loaded) {
    console.debug("[Analytics] PostHog already initialized");
    return;
  }

  try {
    posthog.init(REACT_APP_POSTHOG_API_KEY, {
      api_host: REACT_APP_POSTHOG_HOST,
      // Respect Do Not Track browser setting
      respect_dnt: true,
      // Don't capture pageviews automatically - we'll do it manually for SPA
      capture_pageview: false,
      // Don't capture pageleave automatically
      capture_pageleave: false,
      // Disable autocapture for now - can be enabled later
      autocapture: false,
      // Persist across sessions
      persistence: "localStorage+cookie",
      // Load feature flags
      loaded: (posthog) => {
        console.debug("[Analytics] PostHog initialized successfully");
        // Capture initial pageview
        posthog.capture("$pageview");
      },
    });
  } catch (error) {
    console.error("[Analytics] Failed to initialize PostHog:", error);
  }
}

/**
 * Shutdown PostHog and clear any stored data
 */
export function shutdownPostHog(): void {
  if (posthog.__loaded) {
    posthog.opt_out_capturing();
    posthog.reset();
    console.debug("[Analytics] PostHog shutdown and data cleared");
  }
}

/**
 * Identify a user in PostHog
 * Only identifies if PostHog is loaded and user consented
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>
): void {
  if (!posthog.__loaded || !hasAnalyticsConsent()) return;

  try {
    posthog.identify(userId, properties);
  } catch (error) {
    console.error("[Analytics] Failed to identify user:", error);
  }
}

/**
 * Track a custom event
 * Only tracks if PostHog is loaded and user consented
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!posthog.__loaded || !hasAnalyticsConsent()) return;

  try {
    posthog.capture(eventName, properties);
  } catch (error) {
    console.error("[Analytics] Failed to track event:", error);
  }
}

/**
 * Track a page view
 * Only tracks if PostHog is loaded and user consented
 */
export function trackPageView(path?: string): void {
  if (!posthog.__loaded || !hasAnalyticsConsent()) return;

  try {
    posthog.capture("$pageview", path ? { $current_url: path } : undefined);
  } catch (error) {
    console.error("[Analytics] Failed to track pageview:", error);
  }
}

/**
 * Reset PostHog identity (e.g., on logout)
 */
export function resetAnalytics(): void {
  if (!posthog.__loaded) return;

  try {
    posthog.reset();
  } catch (error) {
    console.error("[Analytics] Failed to reset:", error);
  }
}

/**
 * Initialize analytics on app load if consent was previously given
 */
export function initializeAnalyticsOnLoad(): void {
  if (hasAnalyticsConsent() && isPostHogConfigured()) {
    initializePostHog();
  }
}
