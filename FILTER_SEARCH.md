# Advanced Filter Search Feature

## Overview

The system now supports advanced multi-field filtering for precise voter searches. Users can search using multiple criteria simultaneously to find specific voters.

## Available Filters

### Required Filters
1. **Voter Name** - Bengali or English name (required)
2. **Birth Date** - Date of birth in DD/MM/YYYY format (required)

### Optional Filters
3. **Father's Name** - Father's name (optional)
4. **Mother's Name** - Mother's name (optional)
5. **Area/Location** - Area, village, or location name (optional)

## How to Use

### Step 1: Open Advanced Filters
- Click "Show Filters" button in the search section
- The filter panel will expand

### Step 2: Fill Required Fields
- Enter **Voter Name** (Bengali or English)
- Enter **Birth Date** in DD/MM/YYYY format
  - Examples: 15/01/1990, 15-01-1990, 15.01.1990

### Step 3: Add Optional Filters (Optional)
- Enter **Father's Name** if known
- Enter **Mother's Name** if known
- Enter **Area/Location** if known

### Step 4: Search
- System automatically searches when required fields are filled
- Results show only voters matching ALL criteria

## Search Behavior

### Filter Mode
- When Name + Birth Date are filled, system switches to Filter Mode
- Simple search input is disabled
- Search uses all active filters

### Simple Mode
- When filters are not filled, uses simple text search
- Works with name, ID, or keyword search

## Date Format Support

The system accepts multiple date formats:
- `DD/MM/YYYY` - 15/01/1990
- `DD-MM-YYYY` - 15-01-1990
- `DD.MM.YYYY` - 15.01.1990
- `D/M/YYYY` - 5/1/1990 (single digit day/month)

## Privacy Protection

- Filter searches automatically use privacy mode
- Only shows information for matched voters
- Hides other voters' data
- Privacy badge displayed in results

## Technical Details

### Data Extraction
- Extracts structured voter data from PDF pages
- Identifies voter ID, name, birth date, parent names, area
- Parses Bengali text and dates

### Matching Logic
- **Name**: Case-insensitive partial matching
- **Birth Date**: Exact date match (normalized format)
- **Father/Mother Name**: Case-insensitive partial matching
- **Area**: Case-insensitive partial matching

### Performance
- Uses optimized search for initial name matching
- Then applies detailed filtering on matched pages
- Efficient for large PDF collections

## Example Usage

### Example 1: Basic Filter Search
```
Name: "রহিম"
Birth Date: "15/01/1990"
```
Result: Finds all voters named "রহিম" born on 15/01/1990

### Example 2: Full Filter Search
```
Name: "রহিম"
Birth Date: "15/01/1990"
Father's Name: "করিম"
Area: "ঢাকা"
```
Result: Finds voters matching all criteria

### Example 3: With Mother's Name
```
Name: "ফাতিমা"
Birth Date: "20/05/1985"
Mother's Name: "আয়েশা"
```
Result: Finds voters named "ফাতিমা" born on 20/05/1985 with mother "আয়েশা"

## Benefits

1. **Precise Search**: Find exact voters using multiple criteria
2. **Privacy**: Only shows matched voter information
3. **Flexible**: Optional fields allow partial matching
4. **Fast**: Optimized search algorithm
5. **User-Friendly**: Clear interface with helpful hints

## Tips

- Fill at least Name and Birth Date for best results
- Use partial names if full name is unknown
- Date format is flexible - use any supported format
- Optional fields help narrow down results
- Clear filters to return to simple search mode
