import React from "react";
import { DndContext } from "@dnd-kit/core";
import { MemoryRouter } from "react-router-dom";

interface ParentFolderCardTestWrapperProps {
  children: React.ReactNode;
  initialRoute?: string;
}

/**
 * Test wrapper for ParentFolderCard that provides required context:
 * - MemoryRouter for navigation
 * - DndContext for drag-drop functionality
 */
export function ParentFolderCardTestWrapper({
  children,
  initialRoute = "/",
}: ParentFolderCardTestWrapperProps) {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <DndContext>{children}</DndContext>
    </MemoryRouter>
  );
}
