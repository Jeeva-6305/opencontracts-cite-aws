/**
 * Tests for analytics.ts utility functions
 *
 * These tests verify consent-based analytics behavior without actually
 * initializing PostHog (which would require external services).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock posthog-js before importing analytics
vi.mock("posthog-js", () => ({
  default: {
    __loaded: false,
    init: vi.fn(),
    opt_out_capturing: vi.fn(),
    reset: vi.fn(),
    identify: vi.fn(),
    capture: vi.fn(),
  },
}));

// Mock getRuntimeEnv
vi.mock("../env", () => ({
  getRuntimeEnv: vi.fn(() => ({
    REACT_APP_POSTHOG_API_KEY: "",
    REACT_APP_POSTHOG_HOST: "",
  })),
}));

import {
  hasAnalyticsConsent,
  setAnalyticsConsent,
  isPostHogConfigured,
  identifyUser,
  trackEvent,
  trackPageView,
  resetAnalytics,
  initializeAnalyticsOnLoad,
} from "../analytics";
import posthog from "posthog-js";
import { getRuntimeEnv } from "../env";

const ANALYTICS_CONSENT_KEY = "oc_analyticsConsent";

describe("analytics", () => {
  // Store original localStorage
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock = {};

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: vi.fn(() => {
          localStorageMock = {};
        }),
      },
      writable: true,
    });

    // Reset posthog mock state
    (posthog as any).__loaded = false;

    // Reset all mock function calls
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("hasAnalyticsConsent", () => {
    it("returns false when no consent has been given", () => {
      expect(hasAnalyticsConsent()).toBe(false);
    });

    it("returns true when consent has been given", () => {
      localStorageMock[ANALYTICS_CONSENT_KEY] = "true";
      expect(hasAnalyticsConsent()).toBe(true);
    });

    it("returns false for any other value in localStorage", () => {
      localStorageMock[ANALYTICS_CONSENT_KEY] = "false";
      expect(hasAnalyticsConsent()).toBe(false);

      localStorageMock[ANALYTICS_CONSENT_KEY] = "yes";
      expect(hasAnalyticsConsent()).toBe(false);

      localStorageMock[ANALYTICS_CONSENT_KEY] = "";
      expect(hasAnalyticsConsent()).toBe(false);
    });
  });

  describe("setAnalyticsConsent", () => {
    it("stores consent in localStorage when consenting", () => {
      setAnalyticsConsent(true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        ANALYTICS_CONSENT_KEY,
        "true"
      );
    });

    it("removes consent from localStorage when revoking", () => {
      setAnalyticsConsent(false);
      expect(window.localStorage.removeItem).toHaveBeenCalledWith(
        ANALYTICS_CONSENT_KEY
      );
    });
  });

  describe("isPostHogConfigured", () => {
    it("returns false when no API key is configured", () => {
      vi.mocked(getRuntimeEnv).mockReturnValue({
        REACT_APP_POSTHOG_API_KEY: "",
        REACT_APP_POSTHOG_HOST: "",
      } as any);

      expect(isPostHogConfigured()).toBe(false);
    });

    it("returns false in test environment even with API key", () => {
      // In test environment, isTestOrCIEnvironment() returns true
      // so isPostHogConfigured should always return false
      vi.mocked(getRuntimeEnv).mockReturnValue({
        REACT_APP_POSTHOG_API_KEY: "test-key",
        REACT_APP_POSTHOG_HOST: "https://app.posthog.com",
      } as any);

      // This will return false because we're in a test environment
      expect(isPostHogConfigured()).toBe(false);
    });
  });

  describe("identifyUser", () => {
    it("does not call posthog.identify when posthog is not loaded", () => {
      (posthog as any).__loaded = false;

      identifyUser("user-123", { email: "test@example.com" });

      expect(posthog.identify).not.toHaveBeenCalled();
    });

    it("does not call posthog.identify when no consent given", () => {
      (posthog as any).__loaded = true;
      // No consent in localStorage

      identifyUser("user-123", { email: "test@example.com" });

      expect(posthog.identify).not.toHaveBeenCalled();
    });

    it("calls posthog.identify when loaded and consent given", () => {
      (posthog as any).__loaded = true;
      localStorageMock[ANALYTICS_CONSENT_KEY] = "true";

      identifyUser("user-123", { email: "test@example.com" });

      expect(posthog.identify).toHaveBeenCalledWith("user-123", {
        email: "test@example.com",
      });
    });
  });

  describe("trackEvent", () => {
    it("does not call posthog.capture when posthog is not loaded", () => {
      (posthog as any).__loaded = false;

      trackEvent("button_click", { button_name: "submit" });

      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it("does not call posthog.capture when no consent given", () => {
      (posthog as any).__loaded = true;

      trackEvent("button_click", { button_name: "submit" });

      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it("calls posthog.capture when loaded and consent given", () => {
      (posthog as any).__loaded = true;
      localStorageMock[ANALYTICS_CONSENT_KEY] = "true";

      trackEvent("button_click", { button_name: "submit" });

      expect(posthog.capture).toHaveBeenCalledWith("button_click", {
        button_name: "submit",
      });
    });
  });

  describe("trackPageView", () => {
    it("does not call posthog.capture when posthog is not loaded", () => {
      (posthog as any).__loaded = false;

      trackPageView("/home");

      expect(posthog.capture).not.toHaveBeenCalled();
    });

    it("calls posthog.capture with $pageview event when loaded and consent given", () => {
      (posthog as any).__loaded = true;
      localStorageMock[ANALYTICS_CONSENT_KEY] = "true";

      trackPageView("/home");

      expect(posthog.capture).toHaveBeenCalledWith("$pageview", {
        $current_url: "/home",
      });
    });

    it("calls posthog.capture without path when path not provided", () => {
      (posthog as any).__loaded = true;
      localStorageMock[ANALYTICS_CONSENT_KEY] = "true";

      trackPageView();

      expect(posthog.capture).toHaveBeenCalledWith("$pageview", undefined);
    });
  });

  describe("resetAnalytics", () => {
    it("does not call posthog.reset when posthog is not loaded", () => {
      (posthog as any).__loaded = false;

      resetAnalytics();

      expect(posthog.reset).not.toHaveBeenCalled();
    });

    it("calls posthog.reset when posthog is loaded", () => {
      (posthog as any).__loaded = true;

      resetAnalytics();

      expect(posthog.reset).toHaveBeenCalled();
    });
  });

  describe("initializeAnalyticsOnLoad", () => {
    it("does not initialize when no consent given", () => {
      vi.mocked(getRuntimeEnv).mockReturnValue({
        REACT_APP_POSTHOG_API_KEY: "test-key",
        REACT_APP_POSTHOG_HOST: "https://app.posthog.com",
      } as any);

      initializeAnalyticsOnLoad();

      // In test environment, isPostHogConfigured returns false
      // so posthog.init should not be called
      expect(posthog.init).not.toHaveBeenCalled();
    });

    it("does not initialize in test environment even with consent", () => {
      localStorageMock[ANALYTICS_CONSENT_KEY] = "true";
      vi.mocked(getRuntimeEnv).mockReturnValue({
        REACT_APP_POSTHOG_API_KEY: "test-key",
        REACT_APP_POSTHOG_HOST: "https://app.posthog.com",
      } as any);

      initializeAnalyticsOnLoad();

      // In test environment, isTestOrCIEnvironment returns true
      // so posthog should not be initialized
      expect(posthog.init).not.toHaveBeenCalled();
    });
  });
});
