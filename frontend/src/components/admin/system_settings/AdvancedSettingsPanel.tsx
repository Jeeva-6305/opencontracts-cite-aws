import React, { memo, useState, useEffect, useCallback } from "react";
import { Button, Input } from "@os-legal/ui";
import {
  Settings,
  ChevronRight,
  AlertTriangle,
  Key,
  Save,
  Trash2,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import { formatSettingLabel } from "../../../utils/formatters";
import { AdvancedSettingsPanelProps } from "./types";
import {
  AdvancedSettingsToggle,
  AdvancedSettingsContent,
  RequiredBadge,
  FormField,
  FormLabel,
  FormHelperText,
  SecretFieldGroup,
  SecretFieldRow,
  SecretFieldHeader,
  SecretKeyList,
  SecretKeyRow,
  SecretKeyName,
  SecretStatusIndicator,
  DefaultEmbedderPath,
} from "./styles";

/**
 * Collapsible panel showing per-key settings for a selected component.
 * Shows editable fields for required/optional settings and status indicators
 * for secret keys.
 */
export const AdvancedSettingsPanel = memo<AdvancedSettingsPanelProps>(
  ({
    currentSelection,
    configSettings,
    secretSettings,
    isExpanded,
    settingsKey,
    saving,
    onToggle,
    onAddSecrets,
    onDeleteSecrets,
    onSaveConfig,
  }) => {
    const allSettings = [...configSettings, ...secretSettings];
    const anyMissing = allSettings.some((s) => s.required && !s.hasValue);
    const anySecretsConfigured = secretSettings.some((s) => s.hasValue);

    // Local editing state for non-secret settings
    const [editValues, setEditValues] = useState<Record<string, string>>({});
    const [isDirty, setIsDirty] = useState(false);

    // Reset edit state when component selection changes
    useEffect(() => {
      const initial: Record<string, string> = {};
      for (const entry of configSettings) {
        initial[entry.name] =
          entry.currentValue != null ? String(entry.currentValue) : "";
      }
      setEditValues(initial);
      setIsDirty(false);
    }, [currentSelection, configSettings]);

    const handleFieldChange = useCallback((name: string, value: string) => {
      setEditValues((prev) => ({ ...prev, [name]: value }));
      setIsDirty(true);
    }, []);

    const handleSave = useCallback(() => {
      onSaveConfig(currentSelection, editValues);
      setIsDirty(false);
    }, [currentSelection, editValues, onSaveConfig]);

    const hasSettings = allSettings.length > 0;

    return (
      <>
        <AdvancedSettingsToggle
          $expanded={isExpanded}
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={`settings-content-${settingsKey}`}
        >
          <ChevronRight />
          Advanced Settings
          {anyMissing && (
            <RequiredBadge>
              <AlertTriangle />
              Config Required
            </RequiredBadge>
          )}
        </AdvancedSettingsToggle>

        {isExpanded && (
          <AdvancedSettingsContent
            $expanded={isExpanded}
            id={`settings-content-${settingsKey}`}
          >
            {hasSettings ? (
              <>
                {/* Non-secret (required/optional) settings */}
                {configSettings.length > 0 && (
                  <FormField>
                    <FormLabel>
                      <Settings
                        style={{ width: 14, height: 14, marginRight: 6 }}
                      />
                      Configuration
                    </FormLabel>
                    <SecretFieldGroup>
                      {configSettings.map((entry) => (
                        <SecretFieldRow key={entry.name}>
                          <SecretFieldHeader>
                            <FormLabel
                              style={{ marginBottom: 0 }}
                              htmlFor={`config-${settingsKey}-${entry.name}`}
                            >
                              {formatSettingLabel(
                                entry.name,
                                entry.description
                              )}
                            </FormLabel>
                            {entry.required && (
                              <RequiredBadge>
                                <AlertTriangle />
                                Required
                              </RequiredBadge>
                            )}
                          </SecretFieldHeader>
                          {entry.pythonType === "bool" ? (
                            <select
                              id={`config-${settingsKey}-${entry.name}`}
                              value={editValues[entry.name] ?? ""}
                              onChange={(e) =>
                                handleFieldChange(entry.name, e.target.value)
                              }
                              style={{
                                padding: "0.375rem 0.5rem",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                fontSize: "0.875rem",
                                background: "white",
                              }}
                            >
                              <option value="">
                                Default
                                {entry.default != null
                                  ? ` (${entry.default})`
                                  : ""}
                              </option>
                              <option value="true">True</option>
                              <option value="false">False</option>
                            </select>
                          ) : (
                            <Input
                              id={`config-${settingsKey}-${entry.name}`}
                              value={editValues[entry.name] ?? ""}
                              onChange={(e) =>
                                handleFieldChange(entry.name, e.target.value)
                              }
                              placeholder={
                                entry.default != null
                                  ? `Default: ${entry.default}`
                                  : "Enter value..."
                              }
                              fullWidth
                            />
                          )}
                          {entry.envVar && (
                            <FormHelperText>
                              Env var: {entry.envVar}
                            </FormHelperText>
                          )}
                        </SecretFieldRow>
                      ))}
                    </SecretFieldGroup>
                    {isDirty && (
                      <div style={{ marginTop: "0.75rem" }}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSave}
                          loading={saving}
                        >
                          <Save
                            style={{ width: 14, height: 14, marginRight: 6 }}
                          />
                          Save Configuration
                        </Button>
                      </div>
                    )}
                  </FormField>
                )}

                {/* Secret settings */}
                {secretSettings.length > 0 && (
                  <FormField>
                    <FormLabel>
                      <Key style={{ width: 14, height: 14, marginRight: 6 }} />
                      Secret Keys
                    </FormLabel>
                    <SecretKeyList>
                      {secretSettings.map((entry) => (
                        <SecretKeyRow key={entry.name}>
                          <SecretKeyName>{entry.name}</SecretKeyName>
                          {entry.required && (
                            <RequiredBadge>
                              <AlertTriangle />
                              Required
                            </RequiredBadge>
                          )}
                          <SecretStatusIndicator $populated={!!entry.hasValue}>
                            {entry.hasValue ? (
                              <>
                                <CircleCheck /> Set
                              </>
                            ) : (
                              <>
                                <CircleAlert /> Not set
                              </>
                            )}
                          </SecretStatusIndicator>
                        </SecretKeyRow>
                      ))}
                    </SecretKeyList>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginTop: "0.75rem",
                      }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onAddSecrets(currentSelection)}
                      >
                        <Key
                          style={{ width: 14, height: 14, marginRight: 6 }}
                        />
                        {anySecretsConfigured
                          ? "Update Secrets"
                          : "Configure Secrets"}
                      </Button>
                      {anySecretsConfigured && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onDeleteSecrets(currentSelection)}
                        >
                          <Trash2
                            style={{ width: 14, height: 14, marginRight: 6 }}
                          />
                          Delete All
                        </Button>
                      )}
                    </div>
                  </FormField>
                )}
              </>
            ) : (
              <FormField>
                <FormLabel>Component Path</FormLabel>
                <DefaultEmbedderPath>{currentSelection}</DefaultEmbedderPath>
                <FormHelperText>
                  This component has no additional configuration options.
                </FormHelperText>
              </FormField>
            )}
          </AdvancedSettingsContent>
        )}
      </>
    );
  }
);

AdvancedSettingsPanel.displayName = "AdvancedSettingsPanel";
