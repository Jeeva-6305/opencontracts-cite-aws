import React, { useState, useRef } from "react";
import { FileText, Upload, Pencil } from "lucide-react";
import styled from "styled-components";
import { OS_LEGAL_COLORS } from "../../../assets/configurations/osLegalStyles";

import default_image from "../../../assets/images/defaults/default_image.png";
import default_file from "../../../assets/images/defaults/default_file.png";

interface FilePreviewAndUploadProps {
  isImage: boolean;
  acceptedTypes: string;
  style?: Record<string, any>;
  file: string | ArrayBuffer;
  readOnly: boolean;
  disabled: boolean;
  onChange: ({
    data,
    filename,
  }: {
    data: string | ArrayBuffer;
    filename: string;
  }) => void;
}

const UploadContainer = styled.div<{ $isReadOnly: boolean }>`
  position: relative;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  border: ${(props) =>
    props.$isReadOnly
      ? `1px solid ${OS_LEGAL_COLORS.border}`
      : `2px dashed ${OS_LEGAL_COLORS.primaryBlue}`};
  background: ${(props) =>
    props.$isReadOnly ? OS_LEGAL_COLORS.gray50 : "#fff"};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${(props) =>
      props.$isReadOnly
        ? OS_LEGAL_COLORS.border
        : OS_LEGAL_COLORS.primaryBlueHover};
    cursor: ${(props) => (props.$isReadOnly ? "default" : "pointer")};
  }
`;

const ImagePreview = styled.img`
  width: 100%;
  height: 150px;
  object-fit: contain;
  background: #fff;
  margin: 0;
  padding: 0.75rem;
  display: block;

  @media (max-width: 768px) {
    height: 80px;
    padding: 0.375rem;
  }
`;

const FilePreview = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  gap: 1rem;
`;

const FileName = styled.span`
  color: #666;
  font-size: 0.9rem;
  text-align: center;
  word-break: break-word;
  max-width: 90%;
`;

const UploadOverlay = styled.div<{ $isReadOnly: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(33, 133, 208, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;

  ${(props) =>
    !props.$isReadOnly &&
    `
    &:hover {
      opacity: 1;
      background: rgba(33, 133, 208, 0.1);
    }
  `}
`;

const EditBadge = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: ${OS_LEGAL_COLORS.primaryBlue};
  color: white;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.8;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }

  @media (max-width: 768px) {
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.35rem 0.5rem;
    font-size: 0.7rem;
    gap: 0.25rem;
  }
`;

export const FilePreviewAndUpload = ({
  isImage,
  acceptedTypes,
  style,
  file,
  readOnly,
  disabled,
  onChange,
}: FilePreviewAndUploadProps) => {
  const [newFile, setNewFile] = useState<string | ArrayBuffer>();
  const [newFilename, setNewFilename] = useState<string>();
  const fileRef = useRef() as React.MutableRefObject<HTMLInputElement>;

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      let reader = new FileReader();
      reader.onload = (e) => {
        if (e?.target?.result) {
          setNewFile(e.target.result);
          onChange({
            data: e.target.result,
            filename:
              event?.target?.files !== null && event.target.files[0].name
                ? event.target.files[0].name
                : "",
          });
        }
      };
      setNewFilename(event.target.files[0].name);
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const onFileClick = () => {
    if (!readOnly && !disabled && fileRef?.current) {
      fileRef.current.click();
    }
  };

  const displayedFile = newFile || file;
  const displayedFilename =
    newFilename || (typeof file === "string" ? file : "");

  return (
    <UploadContainer
      $isReadOnly={readOnly || disabled}
      onClick={onFileClick}
      style={style}
    >
      {isImage ? (
        <>
          <ImagePreview
            src={
              typeof displayedFile === "string" && displayedFile
                ? displayedFile
                : default_image
            }
            alt="Preview"
          />
          {!readOnly && !disabled && (
            <EditBadge>
              <Pencil size={12} />
              Edit
            </EditBadge>
          )}
        </>
      ) : (
        <FilePreview>
          <FileText size={48} color={OS_LEGAL_COLORS.primaryBlue} />
          <FileName>{displayedFilename || "No file selected"}</FileName>
        </FilePreview>
      )}

      {!readOnly && !disabled && (
        <UploadOverlay $isReadOnly={readOnly || disabled}>
          <Upload size={32} color={OS_LEGAL_COLORS.primaryBlue} />
        </UploadOverlay>
      )}

      <input
        ref={fileRef}
        readOnly={readOnly}
        id="selectImage"
        accept={acceptedTypes}
        hidden
        type="file"
        onChange={onFileChange}
      />
    </UploadContainer>
  );
};
