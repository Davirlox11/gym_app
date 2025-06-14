#!/usr/bin/env python3
"""
Optimized PDF parser using only essential dependencies
"""
import sys
import json
import os
from typing import Dict, Any, List, Optional
import pdfplumber
import re

class OptimizedPDFParser:
    def __init__(self):
        self.workout_keywords = [
            'esercizio', 'exercise', 'allenamento', 'workout', 'training',
            'serie', 'set', 'sets', 'ripetizioni', 'rep', 'reps',
            'settimana', 'week', 'sett', 'giorno', 'day'
        ]
        
    def parse_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """Parse PDF and extract workout data"""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                pages_data = []
                
                for page_num, page in enumerate(pdf.pages):
                    page_data = self._extract_page_data(page, page_num + 1)
                    if page_data:
                        pages_data.append(page_data)
                
                return {
                    "pages": pages_data,
                    "success": True,
                    "total_pages": len(pdf.pages)
                }
                
        except Exception as e:
            print(f"Error parsing PDF: {e}", file=sys.stderr)
            return {"pages": [], "success": False, "error": str(e)}
    
    def _extract_page_data(self, page, page_num: int) -> Optional[Dict[str, Any]]:
        """Extract data from a single page"""
        try:
            # Extract text to check for workout content
            text = page.extract_text()
            if not text or not any(keyword in text.lower() for keyword in self.workout_keywords):
                return None
            
            # Extract tables
            tables = page.extract_tables()
            if not tables:
                # Try text-based extraction
                return self._extract_from_text(text, page_num)
                
            for table in tables:
                if self._is_workout_table(table):
                    exercises = self._parse_workout_table(table)
                    if exercises:
                        return {
                            "pageNumber": page_num,
                            "title": self._extract_page_title(text, page_num),
                            "exercises": exercises
                        }
            
            # Fallback to text extraction
            return self._extract_from_text(text, page_num)
            
        except Exception as e:
            print(f"Error processing page {page_num}: {e}", file=sys.stderr)
            return None
    
    def _is_workout_table(self, table: List[List[str]]) -> bool:
        """Check if table contains workout data"""
        if not table or len(table) < 2:
            return False
            
        # Check all rows, not just headers, for workout content
        table_text = ' '.join([
            ' '.join([str(cell) for cell in row if cell]) 
            for row in table[:3]  # Check first 3 rows
        ]).lower()
        
        # More flexible keyword matching
        workout_indicators = [
            'esercizio', 'exercise', 'serie', 'set', 'ripetizioni', 'rep',
            'squat', 'panca', 'bench', 'press', 'curl', 'row', 'pull',
            'deadlift', 'stacco', 'kg', 'peso', 'weight'
        ]
        
        return any(indicator in table_text for indicator in workout_indicators)
    
    def _parse_workout_table(self, table: List[List[str]]) -> List[Dict[str, Any]]:
        """Parse workout table into exercises"""
        if not table or len(table) < 2:
            return []
        
        exercises = []
        
        # Try multiple header row positions
        header_row_idx = 0
        for i in range(min(3, len(table))):
            row_text = ' '.join([str(cell) for cell in table[i] if cell]).lower()
            if any(keyword in row_text for keyword in ['esercizio', 'exercise', 'serie', 'set']):
                header_row_idx = i
                break
        
        headers = [str(cell).lower().strip() if cell else "" for cell in table[header_row_idx]]
        
        # More flexible column detection
        exercise_col = -1
        for i, header in enumerate(headers):
            if any(keyword in header for keyword in ['esercizio', 'exercise', 'nome', 'name']):
                exercise_col = i
                break
        
        # Find week/weight columns
        week_cols = {}
        for i, header in enumerate(headers):
            header_clean = header.strip()
            # Look for week patterns, numbers, or weight indicators
            if (re.search(r'sett|week|\d+|peso|weight|kg', header_clean) and 
                len(header_clean) > 0 and header_clean not in ['esercizio', 'exercise']):
                week_num = len(week_cols) + 1
                week_cols[f"settimana_{week_num}"] = i
        
        # Process data rows (skip header row)
        for row_idx, row in enumerate(table[header_row_idx + 1:], 1):
            if not row or not any(row):
                continue
            
            # Get exercise name from first non-empty column if exercise_col not found
            exercise_name = ""
            if exercise_col >= 0 and exercise_col < len(row) and row[exercise_col]:
                exercise_name = str(row[exercise_col]).strip()
            else:
                # Fallback: use first non-empty cell
                for cell in row:
                    if cell and str(cell).strip() and len(str(cell).strip()) > 2:
                        exercise_name = str(cell).strip()
                        break
            
            if not exercise_name or len(exercise_name) < 3:
                continue
            
            # Build weeks data from found columns
            weeks = {}
            if week_cols:
                for week_name, col_idx in week_cols.items():
                    if col_idx < len(row) and row[col_idx]:
                        value = str(row[col_idx]).strip()
                        if value and value.lower() not in ['none', 'null', '']:
                            weeks[week_name] = {"weight": value}
            
            # Ensure we have at least 4 weeks structure
            for i in range(1, 5):
                week_key = f"settimana_{i}"
                if week_key not in weeks:
                    weeks[week_key] = {"weight": ""}
            
            exercise = {
                "id": f"ex_{len(exercises) + 1}",
                "name": exercise_name,
                "setsReps": "3 x 10",
                "weeks": weeks
            }
            
            exercises.append(exercise)
            
            # Limit to reasonable number of exercises
            if len(exercises) >= 10:
                break
        
        return exercises
    
    def _find_column_index(self, headers: List[str], keywords: List[str]) -> int:
        """Find column index by keywords"""
        for i, header in enumerate(headers):
            if any(keyword in header for keyword in keywords):
                return i
        return -1
    
    def _extract_page_title(self, text: str, page_num: int) -> str:
        """Extract page title from text"""
        lines = text.split('\n')[:10]  # Check first 10 lines
        for line in lines:
            line = line.strip()
            if any(keyword in line.lower() for keyword in ['giorno', 'day', 'allenamento', 'workout']):
                return line
        return f"Giorno {page_num}"
    
    def _extract_from_text(self, text: str, page_num: int) -> Optional[Dict[str, Any]]:
        """Extract workout data from text when tables are not available"""
        lines = text.split('\n')
        exercises = []
        exercise_count = 0
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Look for exercise patterns
            if any(keyword in line.lower() for keyword in ['squat', 'panca', 'stacco', 'press', 'curl', 'row']):
                exercise_count += 1
                exercise = {
                    "id": f"ex_{exercise_count}",
                    "name": line,
                    "setsReps": "3 x 10",
                    "weeks": {
                        "settimana_1": {"weight": ""},
                        "settimana_2": {"weight": ""},
                        "settimana_3": {"weight": ""},
                        "settimana_4": {"weight": ""}
                    }
                }
                exercises.append(exercise)
                
                if exercise_count >= 7:  # Limit to 7 exercises
                    break
        
        if exercises:
            return {
                "pageNumber": page_num,
                "title": self._extract_page_title(text, page_num),
                "exercises": exercises
            }
        
        return None

def parsePDF(pdf_path: str) -> Dict[str, Any]:
    """Main function to parse PDF"""
    parser = OptimizedPDFParser()
    return parser.parse_pdf(pdf_path)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python optimized_pdf_parser.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = parsePDF(pdf_path)
    print(json.dumps(result, indent=2))