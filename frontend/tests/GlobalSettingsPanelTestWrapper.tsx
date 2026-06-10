import React from "react";
import { MemoryRouter } from "react-router-dom";
import { GlobalSettingsPanel } from "../src/components/admin/GlobalSettingsPanel";

const GlobalSettingsPanelTestWrapper: React.FC = () => (
  <MemoryRouter>
    <GlobalSettingsPanel />
  </MemoryRouter>
);

export default GlobalSettingsPanelTestWrapper;
