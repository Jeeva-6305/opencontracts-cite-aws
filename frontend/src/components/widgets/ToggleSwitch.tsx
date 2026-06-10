import styled from "styled-components";
import { OS_LEGAL_COLORS } from "../../assets/configurations/osLegalStyles";

export const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  transform: scale(1.1);

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${OS_LEGAL_COLORS.border};
    border-radius: 20px;
    transition: 0.2s;

    &:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: 0.2s;
    }
  }

  input:checked + span {
    background-color: ${OS_LEGAL_COLORS.primaryBlue};
  }

  input:checked + span:before {
    transform: translateX(16px);
  }

  input:focus-visible + span {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
    outline: 2px solid transparent;
  }
`;
