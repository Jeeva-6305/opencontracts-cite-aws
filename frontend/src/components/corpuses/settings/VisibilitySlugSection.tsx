/**
 * VisibilitySlugSection - Public visibility toggle and slug input
 *
 * IMPORTANT: Test IDs must be preserved:
 * - #corpus-is-public-checkbox
 * - #corpus-slug-input
 */
import React from "react";
import { Save, AlertTriangle } from "lucide-react";
import { Button } from "@os-legal/ui";
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardTitle,
  SettingsCardContent,
  FormGrid,
  FormField,
  CheckboxContainer,
  StyledInput,
  PermissionBanner,
} from "../styles/corpusSettingsStyles";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";

interface VisibilitySlugSectionProps {
  publicDraft: boolean;
  setPublicDraft: (value: boolean) => void;
  slugDraft: string;
  setSlugDraft: (value: string) => void;
  originalSlug: string;
  originalIsPublic: boolean;
  canUpdate: boolean;
  canChangeVisibility: boolean;
  onSave: () => void;
  loading: boolean;
}

export const VisibilitySlugSection: React.FC<VisibilitySlugSectionProps> = ({
  publicDraft,
  setPublicDraft,
  slugDraft,
  setSlugDraft,
  originalSlug,
  originalIsPublic,
  canUpdate,
  canChangeVisibility,
  onSave,
  loading,
}) => {
  const hasNoPermissions = !canUpdate && !canChangeVisibility;
  const visibilityChanged = publicDraft !== originalIsPublic;
  const slugChanged = slugDraft !== originalSlug;
  const hasChanges = visibilityChanged || slugChanged;

  return (
    <SettingsCard>
      <SettingsCardHeader>
        <SettingsCardTitle>Visibility & Slug</SettingsCardTitle>
      </SettingsCardHeader>
      <SettingsCardContent>
        {hasNoPermissions && (
          <PermissionBanner>
            <AlertTriangle size={20} />
            <span>
              You don't have permission to update these settings. Contact the
              corpus owner for access.
            </span>
          </PermissionBanner>
        )}

        <FormGrid>
          <FormField disabled={!canChangeVisibility}>
            <div className="field-label">
              Public visibility
              {!canChangeVisibility && (
                <span className="no-permission">No permission</span>
              )}
            </div>
            <CheckboxContainer disabled={!canChangeVisibility}>
              <input
                id="corpus-is-public-checkbox"
                type="checkbox"
                checked={publicDraft}
                disabled={!canChangeVisibility}
                onChange={(e) => setPublicDraft(e.target.checked)}
              />
              <span className="checkbox-label">
                Make corpus publicly accessible
              </span>
            </CheckboxContainer>
          </FormField>

          <FormField disabled={!canUpdate}>
            <div className="field-label">
              Slug
              {!canUpdate && (
                <span className="no-permission">No permission</span>
              )}
            </div>
            <StyledInput
              id="corpus-slug-input"
              type="text"
              placeholder="Repo slug (case-sensitive)"
              value={slugDraft}
              disabled={!canUpdate}
              onChange={(e) => setSlugDraft(e.target.value)}
            />
          </FormField>
        </FormGrid>

        <div style={{ marginTop: "1.5rem" }}>
          <Button
            variant="primary"
            loading={loading}
            disabled={hasNoPermissions || !hasChanges}
            onClick={onSave}
            leftIcon={<Save size={16} />}
            style={{
              background: hasNoPermissions ? OS_LEGAL_COLORS.border : undefined,
              cursor: hasNoPermissions ? "not-allowed" : undefined,
            }}
          >
            Save Changes
          </Button>
        </div>
      </SettingsCardContent>
    </SettingsCard>
  );
};
