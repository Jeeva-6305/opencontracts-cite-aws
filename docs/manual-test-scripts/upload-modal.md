# Upload Modal - Manual Test Script

## Overview

The Upload Modal provides two modes:
- **Single Mode**: Upload individual PDF files with metadata
- **Bulk Mode**: Upload a ZIP file containing multiple PDFs

## Prerequisites

1. Development server running (`cd frontend && yarn start`)
2. Logged in as a user with document upload permissions
3. At least one corpus created with CAN_UPDATE permission
4. Test files prepared:
   - 2-3 PDF files (small, < 5MB each)
   - 1 ZIP file containing 2-3 PDFs
   - 1 invalid file (e.g., .txt or .jpg)

---

## Bulk Upload Mode Tests

### BU-001: Open Bulk Upload Modal
**Purpose**: Verify bulk upload modal opens correctly
**Steps**:
1. Navigate to Documents page
2. Click the "Bulk Upload" button (or open via menu)
**Expected Result**:
- Modal opens with "Bulk Upload Documents" header
- ZIP file drop zone is visible
- Corpus dropdown is visible
- Cancel and Upload buttons are visible
**Pass/Fail**: [ ]

### BU-002: Validate ZIP File Selection
**Purpose**: Only .zip files should be accepted
**Steps**:
1. Open bulk upload modal
2. Click "Browse Files" button
3. Try to select a .pdf file
**Expected Result**: File should be rejected or filtered out
**Pass/Fail**: [ ]

### BU-003: Select Valid ZIP File
**Purpose**: ZIP file can be selected and displayed
**Steps**:
1. Open bulk upload modal
2. Click "Browse Files"
3. Select a valid .zip file
**Expected Result**:
- File name and size are displayed
- "Change File" option appears
- Upload button becomes enabled
**Pass/Fail**: [ ]

### BU-004: Drag and Drop ZIP File
**Purpose**: ZIP file can be dropped into drop zone
**Steps**:
1. Open bulk upload modal
2. Drag a .zip file over the drop zone
3. Drop the file
**Expected Result**:
- Drop zone highlights during drag
- File is accepted and displayed
**Pass/Fail**: [ ]

### BU-005: Upload Without Corpus
**Purpose**: ZIP can be uploaded without selecting a corpus
**Steps**:
1. Open bulk upload modal
2. Select a valid .zip file
3. Leave corpus dropdown empty
4. Click "Upload ZIP"
**Expected Result**:
- Upload starts
- Progress is shown
- Modal closes on success
- Toast notification appears
**Pass/Fail**: [ ]

### BU-006: Upload With Corpus Selected
**Purpose**: ZIP uploads documents to selected corpus
**Steps**:
1. Open bulk upload modal
2. Select a valid .zip file
3. Select a corpus from dropdown
4. Click "Upload ZIP"
**Expected Result**:
- Upload completes successfully
- Documents appear in selected corpus
**Pass/Fail**: [ ]

### BU-007: Cancel Bulk Upload
**Purpose**: Modal can be closed without uploading
**Steps**:
1. Open bulk upload modal
2. Select a .zip file
3. Click "Cancel"
**Expected Result**:
- Modal closes
- No upload occurs
**Pass/Fail**: [ ]

---

## Single/Document Upload Mode Tests

### SU-001: Open Document Upload Modal
**Purpose**: Verify document upload modal opens correctly
**Steps**:
1. Navigate to Documents page (or Corpus detail page)
2. Click "Upload Document" button
**Expected Result**:
- Modal opens with "Upload Documents" header
- PDF file drop zone is visible
- Step indicator shows "Select" as active
**Pass/Fail**: [ ]

### SU-002: Select Single PDF File
**Purpose**: Single PDF can be selected
**Steps**:
1. Open document upload modal
2. Click "Browse Files"
3. Select one PDF file
**Expected Result**:
- File appears in list with name visible
- Continue button becomes enabled
**Pass/Fail**: [ ]

### SU-003: Select Multiple PDF Files
**Purpose**: Multiple PDFs can be selected at once
**Steps**:
1. Open document upload modal
2. Click "Browse Files"
3. Select 3 PDF files (Ctrl/Cmd+click)
**Expected Result**:
- All 3 files appear in the list
- Each file has a remove button
**Pass/Fail**: [ ]

### SU-004: Drag and Drop PDFs
**Purpose**: PDFs can be dropped into drop zone
**Steps**:
1. Open document upload modal
2. Drag 2 PDF files over the drop zone
3. Drop them
**Expected Result**:
- Drop zone highlights during drag
- Both files appear in list
**Pass/Fail**: [ ]

### SU-005: Remove File from List
**Purpose**: Files can be removed before upload
**Steps**:
1. Open document upload modal
2. Add 3 PDF files
3. Click remove (X) button on middle file
**Expected Result**:
- File is removed from list
- Other files remain
**Pass/Fail**: [ ]

### SU-006: Navigate to Details Step
**Purpose**: Can proceed to edit document details
**Steps**:
1. Open document upload modal
2. Add 1-2 PDF files
3. Click "Continue"
**Expected Result**:
- Step indicator shows "Details" as active
- File list and edit form are visible
- Form shows first file's default values
**Pass/Fail**: [ ]

### SU-007: Edit Document Title
**Purpose**: Document title can be modified
**Steps**:
1. Get to Details step with a file selected
2. Click on a file in the list
3. Change the title in the form
4. Click on a different file
5. Click back to original file
**Expected Result**:
- Title change is preserved
- Form shows updated title when file re-selected
**Pass/Fail**: [ ]

### SU-008: Edit Document Description
**Purpose**: Document description can be modified
**Steps**:
1. Get to Details step with a file selected
2. Click on a file
3. Modify the description
4. Proceed to next step and back
**Expected Result**:
- Description change is preserved
**Pass/Fail**: [ ]

### SU-009: Navigate to Corpus Step (No Pre-selected Corpus)
**Purpose**: Corpus selection step appears when no corpus pre-selected
**Steps**:
1. Open document upload modal from Documents page (not from a corpus)
2. Add files and proceed through Details step
3. Click "Continue" from Details step
**Expected Result**:
- Step indicator shows "Corpus" as active
- Corpus search and list is visible
- Can search and select a corpus
**Pass/Fail**: [ ]

### SU-010: Skip Corpus Selection
**Purpose**: Can upload without selecting a corpus
**Steps**:
1. Get to Corpus step
2. Click "Skip" button
**Expected Result**:
- Upload begins
- Documents are uploaded without corpus association
**Pass/Fail**: [ ]

### SU-011: Upload with Pre-selected Corpus
**Purpose**: Upload goes directly from Details to upload when corpus provided
**Steps**:
1. Navigate to a Corpus detail page
2. Click "Upload Document"
3. Add files and proceed through Details
4. Click "Upload"
**Expected Result**:
- No Corpus step shown (only 2 steps)
- Documents upload to that corpus
- Documents appear in corpus document list
**Pass/Fail**: [ ]

### SU-012: Upload Progress Display
**Purpose**: Upload progress is shown during upload
**Steps**:
1. Prepare to upload 3 files
2. Start upload
**Expected Result**:
- Progress bar appears
- Individual file statuses update
- Success/failure indicators appear per file
**Pass/Fail**: [ ]

### SU-013: Navigate Back Between Steps
**Purpose**: Can go back to previous steps
**Steps**:
1. Get to Details step
2. Click "Back"
3. Verify on Select step
4. Click "Continue" to return to Details
5. If corpus step available, go there and click "Back"
**Expected Result**:
- Navigation works correctly
- Data is preserved when going back and forth
**Pass/Fail**: [ ]

### SU-014: Cancel at Any Step
**Purpose**: Modal can be closed at any step
**Steps**:
1. Add files, go to Details step
2. Click "Cancel" or "Close" button
**Expected Result**:
- Modal closes
- No upload occurs
**Pass/Fail**: [ ]

---

## Form Validation Tests

### FV-001: Title Required
**Purpose**: Title field is required
**Steps**:
1. Get to Details step
2. Select a file
3. Clear the title field completely
4. Try to proceed
**Expected Result**:
- Cannot proceed with empty title
- Error indication on title field (or disabled submit)
**Pass/Fail**: [ ]

### FV-002: Description Required
**Purpose**: Description field is required
**Steps**:
1. Get to Details step
2. Select a file
3. Clear the description field
4. Try to proceed
**Expected Result**:
- Cannot proceed with empty description
- Error indication shown
**Pass/Fail**: [ ]

### FV-003: Slug Optional
**Purpose**: Slug field is optional
**Steps**:
1. Get to Details step
2. Leave slug empty for all files
3. Proceed and complete upload
**Expected Result**:
- Upload succeeds
- Backend auto-generates slugs
**Pass/Fail**: [ ]

---

## Mobile Responsiveness Tests

### MR-001: Modal on Mobile Viewport
**Purpose**: Modal displays correctly on mobile
**Steps**:
1. Open browser dev tools, set viewport to 375x667 (iPhone SE)
2. Open document upload modal
**Expected Result**:
- Modal is full-width or nearly full-width
- All controls are accessible
- Buttons are stacked vertically
- No horizontal scrolling required
**Pass/Fail**: [ ]

### MR-002: Touch Interactions
**Purpose**: Touch interactions work properly
**Steps**:
1. On mobile viewport or actual device
2. Tap to select files
3. Tap files in list to select
4. Use form inputs
**Expected Result**:
- All touch targets are at least 44px
- Form inputs work correctly
- No double-tap zoom issues
**Pass/Fail**: [ ]

### MR-003: Corpus Search on Mobile
**Purpose**: Corpus search works on mobile
**Steps**:
1. On mobile viewport
2. Get to Corpus selection step
3. Type in search box
4. Scroll through results
5. Select a corpus
**Expected Result**:
- Keyboard doesn't obscure search
- Scrolling works smoothly
- Selection works correctly
**Pass/Fail**: [ ]

---

## Error Handling Tests

### EH-001: Network Error During Upload
**Purpose**: Network errors are handled gracefully
**Steps**:
1. Open dev tools Network tab
2. Prepare to upload a file
3. Set network to "Offline" or throttle heavily
4. Start upload
**Expected Result**:
- Error message is displayed
- User can retry
- Modal doesn't crash
**Pass/Fail**: [ ]

### EH-002: Server Error Response
**Purpose**: Server errors are displayed to user
**Steps**:
1. If possible, trigger a server error (e.g., corrupted file)
2. Start upload
**Expected Result**:
- Error message from server is displayed
- Failed file shows error status
**Pass/Fail**: [ ]

---

## Integration with Folders

### IF-001: Upload to Specific Folder
**Purpose**: Documents can be uploaded to a folder within a corpus
**Steps**:
1. Navigate to a folder within a corpus
2. Click "Upload Document"
3. Complete upload process
**Expected Result**:
- Documents appear in that specific folder
- Documents don't appear in corpus root (unless also shown there)
**Pass/Fail**: [ ]

---

## Notes

- Record any deviations from expected behavior as GitHub issues
- Note browser and OS version when reporting issues
- Screenshots are helpful for UI-related issues
