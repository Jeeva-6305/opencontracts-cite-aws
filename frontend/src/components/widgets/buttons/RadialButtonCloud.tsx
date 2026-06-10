import React, { useState, useRef, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { Modal, ModalBody, ModalFooter, Button } from "@os-legal/ui";
import { DynamicIcon } from "../icon-picker/DynamicIcon";
import { getLuminance } from "polished";
import useWindowDimensions from "../../hooks/WindowDimensionHook";
import { MOBILE_VIEW_BREAKPOINT } from "../../../assets/configurations/constants";
import {
  OS_LEGAL_COLORS,
  accentAlpha,
} from "../../../assets/configurations/osLegalStyles";

/** Spiral growth rate — higher values spread buttons outward faster. */
const SPIRAL_GROWTH_RATE = 6;
/** Spiral spacing as % of window height on desktop. */
const SPIRAL_SPACING_DESKTOP_PCT = 3;
/** Spiral spacing as % of window height on mobile. */
const SPIRAL_SPACING_MOBILE_PCT = 8;
/** Number of inner spiral positions to skip (keeps buttons away from center). */
const SPIRAL_SKIP_COUNT = 2;

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 ${accentAlpha(0.7)};
  }
  70% {
    box-shadow: 0 0 0 10px ${accentAlpha(0)};
  }
  100% {
    box-shadow: 0 0 0 0 ${accentAlpha(0)};
  }
`;

interface PulsingDotProps {
  $backgroundColor: string;
}

const PulsingDot = styled.div<PulsingDotProps>`
  width: 12px;
  height: 12px;
  background-color: ${(props) => props.$backgroundColor};
  border-radius: 50%;
  animation: ${pulse} 2s infinite;
  cursor: pointer;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
    border-radius: 50%;
  }
`;

const CloudContainer = styled.div`
  position: absolute;
  top: -60px;
  left: -60px;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
`;

interface ButtonPosition {
  x: number;
  y: number;
}

function calculateButtonPositions(
  n: number,
  a: number,
  spacingAlong: number,
  skipCount: number = 2
): ButtonPosition[] {
  const positions: ButtonPosition[] = [];
  let t = 0;

  for (let i = 0; i < n + skipCount; i++) {
    const r = a * t;
    positions.push({
      x: r * Math.cos(t),
      y: r * Math.sin(t),
    });

    // Calculate the next t value based on the desired arc length
    // The arc length of a spiral from 0 to t is approximately (a/2) * (t^2)
    // So, we solve for the next t that gives us an additional arc length of 'spacingAlong'
    const currentArcLength = (a / 2) * (t * t);
    const nextArcLength = currentArcLength + spacingAlong;
    t = Math.sqrt((2 * nextArcLength) / a);
  }

  // Return only the positions after skipping the specified number
  return positions.slice(skipCount);
}

interface CloudButtonStyledProps {
  $delay: number;
  $position: ButtonPosition;
}

const moveOut = (props: CloudButtonStyledProps) => keyframes`
    from {
      opacity: 0;
      transform: translate(0, 0);
    }
    to {
      opacity: 1;
      transform: translate(
        ${props.$position.x}px,
        ${props.$position.y}px
      );
    }
  `;

const CloudButtonStyled = styled.button<CloudButtonStyledProps>`
  position: absolute;
  opacity: 0;
  animation: ${moveOut} 0.5s forwards;
  animation-delay: ${(props) => props.$delay}s;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  background: #eee;

  &:hover {
    filter: brightness(0.9);
  }
`;

const HighZModal = styled(Modal)`
  && {
    z-index: 20001;
  }
`;

export interface CloudButtonItem {
  name: string;
  color: string;
  tooltip: string;
  protected_message?: string | null;
  onClick: () => void;
}

interface RadialButtonCloudProps {
  parentBackgroundColor: string;
  actions: CloudButtonItem[];
}

const RadialButtonCloud: React.FC<RadialButtonCloudProps> = ({
  parentBackgroundColor,
  actions: buttonList,
}) => {
  const [cloudVisible, setCloudVisible] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    message: string;
    onConfirm: () => void;
  }>({ open: false, message: "", onConfirm: () => {} });

  const { height, width } = useWindowDimensions();
  const cloudRef = useRef<HTMLDivElement | null>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (
      cloudRef.current &&
      !cloudRef.current.contains(event.target as Node) &&
      !(event.target as Element).closest(".pulsing-dot")
    ) {
      setCloudVisible(false);
    }
  };

  const handleButtonClick = (btn: CloudButtonItem) => {
    console.log("handleButtonClick", btn);
    if (btn.protected_message) {
      console.log("Should show confirm!");
      setConfirmModal({
        open: true,
        message: btn.protected_message,
        onConfirm: () => {
          btn.onClick();
          setCloudVisible(false);
        },
      });
    } else {
      btn.onClick();
      setCloudVisible(false);
    }
  };

  useEffect(() => {
    if (cloudVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [cloudVisible]);

  const numButtons = buttonList.length;
  const spacingAlongPercent =
    width <= MOBILE_VIEW_BREAKPOINT
      ? SPIRAL_SPACING_MOBILE_PCT
      : SPIRAL_SPACING_DESKTOP_PCT;
  const spacingAlong = (height * spacingAlongPercent) / 100;

  // Calculate button positions
  const buttonPositions = calculateButtonPositions(
    numButtons,
    SPIRAL_GROWTH_RATE,
    spacingAlong,
    SPIRAL_SKIP_COUNT
  );

  // Calculate dot color with good contrast
  /**
   * Returns an appropriate contrast color based on the background color.
   * The bgColor parameter must be in hex, rgb, rgba, hsl or hsla format.
   *
   * @param bgColor - A string representing the background color.
   * @returns A contrast color in hex format.
   */
  const getContrastColor = (bgColor: string): string => {
    // Handle undefined, null, or empty string
    if (!bgColor) {
      return "#00ff00";
    }

    // If it looks like a hex color without the #, add it
    if (/^[A-Fa-f0-9]{3,6}$/.test(bgColor)) {
      bgColor = "#" + bgColor;
    }

    // Log the validation results for each format
    const validationResults = {
      hex: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(bgColor),
      rgb: /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(bgColor),
      rgba: /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(
        bgColor
      ),
      hsl: /^hsl\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/.test(bgColor),
      hsla: /^hsla\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*[\d.]+\s*\)$/.test(
        bgColor
      ),
    };

    // If the color isn't in a valid format, return default
    if (!Object.values(validationResults).some((result) => result)) {
      return "#00ff00";
    }

    try {
      const luminance = getLuminance(bgColor);
      return luminance > 0.5 ? "#00aa00" : "#00ff00";
    } catch (error: any) {
      return "#00ff00";
    }
  };

  const dotColor = getContrastColor(parentBackgroundColor);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <PulsingDot
        className="pulsing-dot"
        onMouseEnter={() => setCloudVisible(true)}
        $backgroundColor={dotColor}
      />
      {cloudVisible && (
        <CloudContainer ref={cloudRef}>
          {buttonList.map((btn, index) => (
            <CloudButtonStyled
              key={index}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                handleButtonClick(btn);
              }}
              title={btn.tooltip}
              $delay={index * 0.1}
              $position={buttonPositions[index]}
              style={{ background: btn.color || OS_LEGAL_COLORS.border }}
            >
              <DynamicIcon name={btn.name} size={14} />
            </CloudButtonStyled>
          ))}
        </CloudContainer>
      )}
      <HighZModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ ...confirmModal, open: false })}
        size="sm"
      >
        <ModalBody>
          <p>{confirmModal.message}</p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmModal({ ...confirmModal, open: false });
              setCloudVisible(false);
            }}
          >
            No
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              confirmModal.onConfirm();
              setConfirmModal({ ...confirmModal, open: false });
            }}
          >
            Yes
          </Button>
        </ModalFooter>
      </HighZModal>
    </div>
  );
};

export default RadialButtonCloud;
