# Privacy Protection Feature

## Overview

The system now includes privacy protection when searching by voter ID. When a user searches for a specific voter ID, only that voter's information is displayed, and other voters' data is hidden.

## How It Works

### 1. **Voter ID Detection**
- Automatically detects when search input is a voter ID (10-17 digits)
- Triggers privacy mode for ID searches

### 2. **Privacy Mode**
- **ID Searches**: Only shows the exact matched voter's row
- **Name Searches**: Shows limited context (normal behavior)
- **Privacy Badge**: Visual indicator when privacy mode is active

### 3. **Information Filtering**
- Extracts only the specific voter's row from the PDF
- Hides other voters' information from the display
- Shows only the matched voter's data in the modal

## Privacy Features

### ✅ Protected Information
- Other voters' names
- Other voters' IDs
- Other voters' personal details
- Other voters' serial numbers

### ✅ Displayed Information (ID Search)
- Only the searched voter's name
- Only the searched voter's ID
- Only the searched voter's row/entry
- Center information (header data)

### ✅ Displayed Information (Name Search)
- Matched voter's information
- Limited context (2 lines before/after)
- Center information

## User Experience

### When Searching by Voter ID:
1. Enter voter ID (e.g., "1234567890123")
2. System detects it's an ID search
3. Privacy mode activates
4. Only the matched voter's row is extracted
5. Modal shows privacy badge
6. Only that voter's information is displayed

### When Searching by Name:
1. Enter voter name (Bengali or English)
2. Normal search mode
3. Shows matched voter with limited context
4. No privacy restrictions (less sensitive)

## Technical Implementation

### Privacy Service (`privacyService.js`)
- `isVoterIdSearch()` - Detects voter ID searches
- `extractSpecificVoterRow()` - Extracts only the matched row
- `extractVoterInfoPrivacyAware()` - Privacy-aware extraction
- `getPrivacySafeContext()` - Returns filtered context

### Integration Points
- **App.js**: Uses privacy service for voter info extraction
- **VoterInfoModal**: Shows privacy badge and filtered data
- **PDFViewer**: Highlights only the specific voter row for ID searches

## Privacy Guarantees

1. **Exact Match Required**: For ID searches, only exact ID matches are shown
2. **Row-Level Filtering**: Only the matched voter's row is extracted
3. **No Context Leakage**: Other voters' information is not included
4. **Visual Indicator**: Privacy badge shows when privacy mode is active

## Best Practices

- ✅ Always search by exact voter ID for privacy
- ✅ Use name search for general lookup (less privacy concern)
- ✅ Privacy mode automatically activates for ID searches
- ✅ System ensures only the searched voter's data is shown

## Compliance

This feature helps ensure:
- **Data Privacy**: Only requested voter information is displayed
- **GDPR Compliance**: Minimizes data exposure
- **User Trust**: Clear privacy protection indicators
- **Selective Access**: Users only see what they search for
