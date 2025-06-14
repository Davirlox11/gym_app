#!/usr/bin/env python3
"""
Precise PDF parser for Davide Bollella workout format
"""
import sys
import json
import os
from typing import Dict, Any, List, Optional
import pdfplumber
import re

class PrecisePDFParser:
    def __init__(self):
        pass
        
    def parse_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """Parse PDF with precise table structure detection"""
        try:
            pages_data = []
            
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    page_data = self._extract_page_data(page, page_num + 1)
                    if page_data:
                        pages_data.append(page_data)
            
            return {
                "pages": pages_data,
                "success": True,
                "total_pages": len(pages_data)
            }
                
        except Exception as e:
            print(f"Error parsing PDF: {e}", file=sys.stderr)
            return {"pages": [], "success": False, "error": str(e)}
    
    def _extract_page_data(self, page, page_num: int) -> Optional[Dict[str, Any]]:
        """Extract data from a single page"""
        try:
            tables = page.extract_tables()
            if not tables:
                return None
            
            # Take the first (and usually only) table
            table = tables[0]
            if not table or len(table) < 3:
                return None
            
            # Extract page title from first row
            page_title = self._extract_page_title(table, page_num)
            
            # Find the header row (usually row 1, after title)
            header_row = None
            header_row_idx = -1
            
            for i, row in enumerate(table):
                if row and any(cell and 'esercizio' in str(cell).lower() for cell in row):
                    header_row = row
                    header_row_idx = i
                    break
            
            if not header_row or header_row_idx == -1:
                return None
            
            # Parse exercises from data rows
            exercises = self._parse_exercises(table, header_row_idx)
            
            if exercises:
                return {
                    "pageNumber": page_num,
                    "title": page_title,
                    "exercises": exercises
                }
            
            return None
            
        except Exception as e:
            print(f"Error processing page {page_num}: {e}", file=sys.stderr)
            return None
    
    def _extract_page_title(self, table: List[List], page_num: int) -> str:
        """Extract page title from table"""
        if table and table[0] and table[0][0]:
            title = str(table[0][0]).strip()
            if title and 'giorno' in title.lower():
                return title
        return f"Giorno {page_num}"
    
    def _parse_exercises(self, table: List[List], header_row_idx: int) -> List[Dict[str, Any]]:
        """Parse exercises from table data"""
        exercises = []
        
        if header_row_idx == -1 or len(table) <= header_row_idx + 1:
            return exercises
        
        header_row = table[header_row_idx]
        
        # Map column indices based on actual structure
        # Expected: ['Esercizio', 'Sett. 1', 'Sett. 2', 'Sett. 3', 'Sett. 4', 'Sett. 5', 'Scarico+test', 'Recupero', 'Note pesi']
        exercise_col = 0  # Esercizio
        week_cols = {
            'settimana_1': 1,  # Sett. 1
            'settimana_2': 2,  # Sett. 2  
            'settimana_3': 3,  # Sett. 3
            'settimana_4': 4,  # Sett. 4
            'settimana_5': 5,  # Sett. 5
        }
        scarico_col = 6     # Scarico+test
        recupero_col = 7    # Recupero
        note_col = 8        # Note pesi
        
        # Process each data row
        for row_idx in range(header_row_idx + 1, len(table)):
            row = table[row_idx]
            if not row or not any(row):
                continue
            
            # Get exercise name
            exercise_name = ""
            if len(row) > exercise_col and row[exercise_col]:
                exercise_name = str(row[exercise_col]).strip()
            
            # Skip empty or invalid exercise names
            if not exercise_name or len(exercise_name) < 3:
                continue
            
            # Skip rows that look like headers or separators
            if any(keyword in exercise_name.lower() for keyword in ['esercizio', 'giorno', 'sett']):
                continue
            
            # Build weeks data with all available columns
            weeks = {}
            
            # Extract week data
            for week_name, col_idx in week_cols.items():
                if len(row) > col_idx and row[col_idx]:
                    value = str(row[col_idx]).strip()
                    if value and value.lower() not in ['none', 'null', '']:
                        weeks[week_name] = {"weight": value}
                    else:
                        weeks[week_name] = {"weight": ""}
                else:
                    weeks[week_name] = {"weight": ""}
            
            # Extract additional data
            scarico_data = ""
            if len(row) > scarico_col and row[scarico_col]:
                scarico_data = str(row[scarico_col]).strip()
            
            recupero_data = ""
            if len(row) > recupero_col and row[recupero_col]:
                recupero_data = str(row[recupero_col]).strip()
            
            # Note pesi dalla colonna 8 (Note pesi)
            note_data = ""
            if len(row) > note_col and row[note_col]:
                note_value = str(row[note_col]).strip()
                if note_value and note_value.lower() not in ['none', 'null', '']:
                    note_data = note_value
            
            # Determine sets/reps from first week data, recupero, or note data
            sets_reps = "3 x 10"  # default fallback
            
            # Prima prova a usare il contenuto della settimana 1
            first_week_content = ""
            for week_name in weeks:
                if weeks[week_name].get("weight"):
                    first_week_content = weeks[week_name]["weight"]
                    break
            
            # Pattern più ampio per riconoscere sets/reps, durate, isometriche, ecc.
            sets_reps_pattern = r'(\d+\s*x\s*\d+|\d+["\']|\d+\s*iso|\d+\s*sec|\d+\s*totali)'
            
            if first_week_content and re.search(sets_reps_pattern, first_week_content, re.IGNORECASE):
                sets_reps = first_week_content
            elif recupero_data and re.search(sets_reps_pattern, recupero_data, re.IGNORECASE):
                sets_reps = recupero_data
            elif note_data and re.search(sets_reps_pattern, note_data, re.IGNORECASE):
                sets_reps = note_data
            
            # Mantieni le settimane vuote come vuote - la logica per il riepilogo sarà nel frontend
            
            exercise = {
                "id": f"ex_{len(exercises) + 1}",
                "name": exercise_name,
                "setsReps": sets_reps,
                "weeks": weeks,
                "scarico": scarico_data,
                "recupero": recupero_data,
                "note": note_data
            }
            
            exercises.append(exercise)
            
            # Limit exercises per page
            if len(exercises) >= 20:
                break
        
        return exercises

def parsePDF(pdf_path: str) -> Dict[str, Any]:
    """Main function to parse PDF"""
    parser = PrecisePDFParser()
    return parser.parse_pdf(pdf_path)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python precise_pdf_parser.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = parsePDF(pdf_path)
    print(json.dumps(result, indent=2))