/**
 * Unit tests for MessageItem helper functions
 *
 * Tests the getAgentDisplayData function that supports agent message styling.
 * hexToRgba tests are now in utils/__tests__/colorUtils.test.ts
 */
import { describe, it, expect } from "vitest";
import { getAgentDisplayData } from "../MessageItem";
import { hexToRgba } from "../../../utils/colorUtils";
import { AgentConfigurationType } from "../../../types/graphql-api";

describe("getAgentDisplayData", () => {
  const createMockAgentConfig = (
    overrides?: Partial<AgentConfigurationType>
  ): AgentConfigurationType => ({
    id: "agent-1",
    name: "Test Agent",
    description: "A test agent",
    systemInstructions: "You are a helpful assistant",
    scope: "CORPUS",
    isActive: true,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    creator: {
      id: "user-1",
      username: "testuser",
      email: "test@example.com",
      slug: "testuser",
      name: "Test User",
      isUsageCapped: false,
    },
    ...overrides,
  });

  it("returns null for null agentConfig", () => {
    expect(getAgentDisplayData(null)).toBeNull();
  });

  it("returns null for undefined agentConfig", () => {
    expect(getAgentDisplayData(undefined)).toBeNull();
  });

  it("returns agent name and default color when badgeConfig is null", () => {
    const config = createMockAgentConfig({ badgeConfig: null });
    const result = getAgentDisplayData(config);

    expect(result).toEqual({
      name: "Test Agent",
      color: "#4A90E2", // Default blue
    });
  });

  it("returns agent name and default color when badgeConfig is undefined", () => {
    const config = createMockAgentConfig({ badgeConfig: undefined });
    const result = getAgentDisplayData(config);

    expect(result).toEqual({
      name: "Test Agent",
      color: "#4A90E2",
    });
  });

  it("returns configured color when badgeConfig has valid hex color", () => {
    const config = createMockAgentConfig({
      badgeConfig: { color: "#FF5733", icon: "Bot" },
    });
    const result = getAgentDisplayData(config);

    expect(result).toEqual({
      name: "Test Agent",
      color: "#FF5733",
    });
  });

  it("returns configured color for 3-digit hex colors", () => {
    const config = createMockAgentConfig({
      badgeConfig: { color: "#F00" },
    });
    const result = getAgentDisplayData(config);

    expect(result).toEqual({
      name: "Test Agent",
      color: "#F00",
    });
  });

  it("falls back to default color for invalid hex color", () => {
    const config = createMockAgentConfig({
      badgeConfig: { color: "not-a-color" },
    });
    const result = getAgentDisplayData(config);

    expect(result).toEqual({
      name: "Test Agent",
      color: "#4A90E2", // Default blue
    });
  });

  it("falls back to default color when color is not a string", () => {
    const config = createMockAgentConfig({
      badgeConfig: { color: 12345 },
    });
    const result = getAgentDisplayData(config);

    expect(result).toEqual({
      name: "Test Agent",
      color: "#4A90E2",
    });
  });

  it("falls back to default color when badgeConfig is an array", () => {
    const config = createMockAgentConfig({
      badgeConfig: ["#FF0000"] as unknown as Record<string, unknown>,
    });
    const result = getAgentDisplayData(config);

    expect(result).toEqual({
      name: "Test Agent",
      color: "#4A90E2",
    });
  });

  it("falls back to default color when badgeConfig has no color field", () => {
    const config = createMockAgentConfig({
      badgeConfig: { icon: "Bot" },
    });
    const result = getAgentDisplayData(config);

    expect(result).toEqual({
      name: "Test Agent",
      color: "#4A90E2",
    });
  });

  it("handles potential XSS in color value by falling back to default", () => {
    const config = createMockAgentConfig({
      badgeConfig: { color: "expression(alert('xss'))" },
    });
    const result = getAgentDisplayData(config);

    expect(result).toEqual({
      name: "Test Agent",
      color: "#4A90E2", // Should fall back to safe default
    });
  });

  it("handles CSS injection attempt by falling back to default", () => {
    const config = createMockAgentConfig({
      badgeConfig: { color: "#000;background:url(evil.js)" },
    });
    const result = getAgentDisplayData(config);

    expect(result).toEqual({
      name: "Test Agent",
      color: "#4A90E2", // Should fall back to safe default
    });
  });
});

describe("hexToRgba", () => {
  describe("6-digit hex colors", () => {
    it("converts black (#000000) correctly", () => {
      expect(hexToRgba("#000000", 1)).toBe("rgba(0, 0, 0, 1)");
    });

    it("converts white (#FFFFFF) correctly", () => {
      expect(hexToRgba("#FFFFFF", 1)).toBe("rgba(255, 255, 255, 1)");
    });

    it("converts red (#FF0000) correctly", () => {
      expect(hexToRgba("#FF0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    });

    it("converts a custom color (#4A90E2) correctly", () => {
      expect(hexToRgba("#4A90E2", 0.08)).toBe("rgba(74, 144, 226, 0.08)");
    });

    it("handles lowercase hex colors", () => {
      expect(hexToRgba("#ff5733", 0.5)).toBe("rgba(255, 87, 51, 0.5)");
    });

    it("handles hex without # prefix", () => {
      expect(hexToRgba("FF5733", 0.5)).toBe("rgba(255, 87, 51, 0.5)");
    });
  });

  describe("3-digit hex colors", () => {
    it("converts 3-digit black (#000) correctly", () => {
      expect(hexToRgba("#000", 1)).toBe("rgba(0, 0, 0, 1)");
    });

    it("converts 3-digit white (#fff) correctly", () => {
      expect(hexToRgba("#fff", 1)).toBe("rgba(255, 255, 255, 1)");
    });

    it("converts 3-digit red (#f00) correctly", () => {
      expect(hexToRgba("#f00", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    });

    it("converts 3-digit custom color (#abc) correctly", () => {
      // #abc expands to #aabbcc
      expect(hexToRgba("#abc", 1)).toBe("rgba(170, 187, 204, 1)");
    });

    it("handles uppercase 3-digit hex", () => {
      expect(hexToRgba("#FFF", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
    });

    it("handles 3-digit hex without # prefix", () => {
      expect(hexToRgba("abc", 0.5)).toBe("rgba(170, 187, 204, 0.5)");
    });
  });

  describe("invalid inputs", () => {
    it("returns default blue for invalid hex string", () => {
      expect(hexToRgba("not-a-color", 0.5)).toBe("rgba(74, 144, 226, 0.5)");
    });

    it("returns default blue for empty string", () => {
      expect(hexToRgba("", 0.5)).toBe("rgba(74, 144, 226, 0.5)");
    });

    it("returns default blue for invalid length hex", () => {
      expect(hexToRgba("#12345", 0.5)).toBe("rgba(74, 144, 226, 0.5)");
    });

    it("returns default blue for 4-digit hex", () => {
      expect(hexToRgba("#1234", 0.5)).toBe("rgba(74, 144, 226, 0.5)");
    });
  });

  describe("alpha values", () => {
    it("handles alpha value of 0", () => {
      expect(hexToRgba("#FF0000", 0)).toBe("rgba(255, 0, 0, 0)");
    });

    it("handles alpha value of 1", () => {
      expect(hexToRgba("#FF0000", 1)).toBe("rgba(255, 0, 0, 1)");
    });

    it("handles decimal alpha values", () => {
      expect(hexToRgba("#FF0000", 0.123)).toBe("rgba(255, 0, 0, 0.123)");
    });
  });
});
