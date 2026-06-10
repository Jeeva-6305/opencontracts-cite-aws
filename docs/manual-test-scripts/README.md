# Manual Test Scripts

This directory contains manual test scripts for features that need verification before integration tests can be written.

## Purpose

Manual test scripts serve as:
1. **Documentation** of expected behavior for each feature
2. **Test checklists** for QA and code review
3. **Foundation** for future automated integration tests

## Format

Each test script follows this format:

```markdown
# [Feature Name] - Manual Test Script

## Prerequisites
- Required setup steps
- Test data needed

## Test Cases

### TC-001: [Test Case Title]
**Purpose**: What this test verifies
**Steps**:
1. Step one
2. Step two
...
**Expected Result**: What should happen
**Pass/Fail**: [ ]
```

## Test Scripts

| Script | Feature | Last Updated |
|--------|---------|--------------|
| [upload-modal.md](./upload-modal.md) | Upload Modal (Bulk & Single) | 2026-01-18 |

## Running Manual Tests

1. Start the development server: `cd frontend && yarn start`
2. Open the test script for the feature being tested
3. Follow each test case step-by-step
4. Mark Pass/Fail in your local copy
5. Report any failures as GitHub issues

## Converting to Integration Tests

When converting manual tests to automated Playwright tests:
1. Use the test script as specification
2. Create corresponding `*.ct.tsx` files in `frontend/tests/`
3. Reference the original test case ID (e.g., TC-001) in test descriptions
4. Update this README to indicate automated coverage
