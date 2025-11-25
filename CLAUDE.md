# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a document repository containing Ukrainian government materials related to state attestation ("державна атестація") of scientific institutions and higher education establishments. The repository does not contain source code or development tools.

## Repository Structure

```
atestat/
├── data/           # Attestation results and data files
│   └── Оголошення результатів.xlsx  # Announcement of results (Excel)
└── method/         # Methodological documents and official orders
    ├── f541316n120.docx             # Methodological guideline
    ├── f541316n129.docx             # Methodological guideline
    └── Про державну атестацію...docx # Official Order № 1485 (21.10.2024)
```

## Working with Documents

### Excel Files (.xlsx)
- Located in `data/` directory
- Contains attestation results and announcements
- Use appropriate tools for reading/parsing Excel files (e.g., openpyxl, pandas, xlsx libraries)

### Word Documents (.docx)
- Located in `method/` directory
- Contains official methodological guidelines and government orders
- Use appropriate tools for reading/parsing Word files (e.g., python-docx, mammoth)

## Content Language

All documents are in Ukrainian. When working with this repository:
- Document titles and content are in Ukrainian (Cyrillic script)
- File naming follows Ukrainian government document conventions
- Official document references include order numbers and dates (e.g., "Наказ № 1485 від 21.10.2024")
