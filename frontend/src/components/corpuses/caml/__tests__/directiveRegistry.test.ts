import { describe, it, expect, beforeEach } from "vitest";
import {
  registerDirectiveHandler,
  unregisterDirectiveHandler,
  getDirectiveHandler,
  getRegisteredAgents,
  clearDirectiveHandlers,
} from "../directiveRegistry";
import type { CamlInlineDirective } from "../inlineDirectives";

const mockDirective: CamlInlineDirective = {
  agent: "test",
  scope: "sentence",
  args: {},
  context: "test context",
  offset: 0,
};

const mockHandler = () => ({
  loading: false,
  node: null,
});

describe("directiveRegistry", () => {
  beforeEach(() => {
    clearDirectiveHandlers();
  });

  it("registers and retrieves a handler", () => {
    registerDirectiveHandler("cite", mockHandler);
    expect(getDirectiveHandler("cite")).toBe(mockHandler);
  });

  it("returns undefined for unregistered agents", () => {
    expect(getDirectiveHandler("unknown")).toBeUndefined();
  });

  it("lists registered agent names", () => {
    registerDirectiveHandler("cite", mockHandler);
    registerDirectiveHandler("review", mockHandler);
    expect(getRegisteredAgents()).toEqual(
      expect.arrayContaining(["cite", "review"])
    );
    expect(getRegisteredAgents()).toHaveLength(2);
  });

  it("unregisters a handler", () => {
    registerDirectiveHandler("cite", mockHandler);
    unregisterDirectiveHandler("cite");
    expect(getDirectiveHandler("cite")).toBeUndefined();
    expect(getRegisteredAgents()).toHaveLength(0);
  });

  it("clears all handlers", () => {
    registerDirectiveHandler("cite", mockHandler);
    registerDirectiveHandler("review", mockHandler);
    clearDirectiveHandlers();
    expect(getRegisteredAgents()).toHaveLength(0);
  });

  it("overwrites handler when re-registering same name", () => {
    const handler2 = () => ({ loading: true, node: null });
    registerDirectiveHandler("cite", mockHandler);
    registerDirectiveHandler("cite", handler2);
    expect(getDirectiveHandler("cite")).toBe(handler2);
  });
});
