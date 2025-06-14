#!/usr/bin/env python3
"""
Enhanced PDF parser with comprehensive table extraction capabilities
"""
import sys
import json
import os
from typing import Dict, Any, List, Optional
import pdfplumber
import pandas as pd
import re

try:
    import camelot
    CAMELOT_AVAILABLE = True
except ImportError:
    CAMELOT_AVAILABLE = False

try:
    import tabula
    TABULA_AVAILABLE = True
except ImportError:
    TABULA_AVAILABLE = False

class EnhancedPDFParser:
    def __init__(self):
        self.workout_keywords = [
            'esercizio', 'exercise', 'allenamento', 'workout', 'training',
            'serie', 'set', 'sets', 'ripetizioni', 'rep', 'reps',
            'settimana', 'week', 'sett', 'giorno', 'day', 'kg', 'peso'
        ]
        
    def parse_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """Parse PDF using multiple extraction methods"""
        try:
            # Try pdfplumber first
            pages_data = self._extract_with_pdfplumber(pdf_path)
            
            # If pdfplumber fails, try camelot
            if not pages_data and CAMELOT_AVAILABLE:
                pages_data = self._extract_with_camelot(pdf_path)
            
            # If both fail, try tabula
            if not pages_data and TABULA_AVAILABLE:
                pages_data = self._extract_with_tabula(pdf_path)
            
            return {
                "pages": pages_data,
                "success": True,
                "total_pages": len(pages_data) if pages_data else 0
            }
                
        except Exception as e:
            print(f"Error parsing PDF: {e}", file=sys.stderr)
            return {"pages": [], "success": False, "error": str(e)}
    
    def _extract_with_pdfplumber(self, pdf_path: str) -> List[Dict[str, Any]]:
        """Extract using pdfplumber"""
        pages_data = []
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    page_data = self._extract_page_data_pdfplumber(page, page_num + 1)
                    if page_data:
                        pages_data.append(page_data)
        except Exception as e:
            print(f"PDFPlumber extraction failed: {e}", file=sys.stderr)
            
        return pages_data
    
    def _extract_with_camelot(self, pdf_path: str) -> List[Dict[str, Any]]:
        """Extract using camelot"""
        pages_data = []
        
        try:
            # Extract all tables from PDF
            tables = camelot.read_pdf(pdf_path, pages='all', flavor='lattice')
            
            if not tables:
                tables = camelot.read_pdf(pdf_path, pages='all', flavor='stream')
            
            page_tables = {}
            for table in tables:
                page_num = table.page
                if page_num not in page_tables:
                    page_tables[page_num] = []
                page_tables[page_num].append(table.df)
            
            for page_num, tables_list in page_tables.items():
                for table_df in tables_list:
                    if self._is_workout_dataframe(table_df):
                        exercises = self._parse_dataframe_to_exercises(table_df)
                        if exercises:
                            pages_data.append({
                                "pageNumber": page_num,
                                "title": f"Giorno {page_num}",
                                "exercises": exercises
                            })
                            
        except Exception as e:
            print(f"Camelot extraction failed: {e}", file=sys.stderr)
            
        return pages_data
    
    def _extract_with_tabula(self, pdf_path: str) -> List[Dict[str, Any]]:
        """Extract using tabula"""
        pages_data = []
        
        try:
            # Extract all tables from PDF
            tables = tabula.read_pdf(pdf_path, pages='all', multiple_tables=True)
            
            for page_num, table_df in enumerate(tables, 1):
                if isinstance(table_df, pd.DataFrame) and self._is_workout_dataframe(table_df):
                    exercises = self._parse_dataframe_to_exercises(table_df)
                    if exercises:
                        pages_data.append({
                            "pageNumber": page_num,
                            "title": f"Giorno {page_num}",
                            "exercises": exercises
                        })
                        
        except Exception as e:
            print(f"Tabula extraction failed: {e}", file=sys.stderr)
            
        return pages_data
    
    def _extract_page_data_pdfplumber(self, page, page_num: int) -> Optional[Dict[str, Any]]:
        """Extract data from a single page using pdfplumber"""
        try:
            text = page.extract_text()
            if not text or not any(keyword in text.lower() for keyword in self.workout_keywords):
                return None
            
            tables = page.extract_tables()
            if not tables:
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
            
            return self._extract_from_text(text, page_num)
            
        except Exception as e:
            print(f"Error processing page {page_num}: {e}", file=sys.stderr)
            return None
    
    def _is_workout_table(self, table: List[List[str]]) -> bool:
        """Check if table contains workout data"""
        if not table or len(table) < 2:
            return False
            
        table_text = ' '.join([
            ' '.join([str(cell) for cell in row if cell]) 
            for row in table[:3]
        ]).lower()
        
        workout_indicators = [
            'esercizio', 'exercise', 'serie', 'set', 'ripetizioni', 'rep',
            'squat', 'panca', 'bench', 'press', 'curl', 'row', 'pull',
            'deadlift', 'stacco', 'kg', 'peso', 'weight'
        ]
        
        return any(indicator in table_text for indicator in workout_indicators)
    
    def _is_workout_dataframe(self, df: pd.DataFrame) -> bool:
        """Check if DataFrame contains workout data"""
        if df.empty or len(df) < 2:
            return False
            
        # Check all text content in DataFrame
        df_text = ' '.join([
            ' '.join([str(cell) for cell in row if pd.notna(cell)]) 
            for row in df.values[:3]
        ]).lower()
        
        # Also check column names
        column_text = ' '.join([str(col) for col in df.columns]).lower()
        all_text = df_text + ' ' + column_text
        
        workout_indicators = [
            'esercizio', 'exercise', 'serie', 'set', 'ripetizioni', 'rep',
            'squat', 'panca', 'bench', 'press', 'curl', 'row', 'pull',
            'deadlift', 'stacco', 'kg', 'peso', 'weight', 'settimana', 'week'
        ]
        
        return any(indicator in all_text for indicator in workout_indicators)
    
    def _parse_workout_table(self, table: List[List[str]]) -> List[Dict[str, Any]]:
        """Parse workout table into exercises"""
        if not table or len(table) < 2:
            return []
        
        exercises = []
        
        # Find header row
        header_row_idx = 0
        for i in range(min(3, len(table))):
            row_text = ' '.join([str(cell) for cell in table[i] if cell]).lower()
            if any(keyword in row_text for keyword in ['esercizio', 'exercise', 'serie', 'set']):
                header_row_idx = i
                break
        
        headers = [str(cell).lower().strip() if cell else "" for cell in table[header_row_idx]]
        
        # Find exercise column
        exercise_col = -1
        for i, header in enumerate(headers):
            if any(keyword in header for keyword in ['esercizio', 'exercise', 'nome', 'name']):
                exercise_col = i
                break
        
        # Find week/weight columns with more comprehensive detection
        week_cols = {}
        for i, header in enumerate(headers):
            header_clean = header.strip().lower()
            # Enhanced week detection patterns
            if (re.search(r'sett|week|\d+|peso|weight|kg|w\d|settimana', header_clean) and 
                len(header_clean) > 0 and 
                header_clean not in ['esercizio', 'exercise', 'nome', 'name']):
                
                # Extract week number if possible
                week_match = re.search(r'(\d+)', header_clean)
                if week_match:
                    week_num = week_match.group(1)
                    week_cols[f"settimana_{week_num}"] = i
                else:
                    week_num = len(week_cols) + 1
                    week_cols[f"settimana_{week_num}"] = i
        
        # Process data rows
        for row_idx, row in enumerate(table[header_row_idx + 1:], 1):
            if not row or not any(row):
                continue
            
            # Get exercise name
            exercise_name = ""
            if exercise_col >= 0 and exercise_col < len(row) and row[exercise_col]:
                exercise_name = str(row[exercise_col]).strip()
            else:
                # Use first meaningful cell
                for cell in row:
                    if cell and str(cell).strip() and len(str(cell).strip()) > 2:
                        cell_text = str(cell).strip()
                        # Skip obvious non-exercise content
                        if not re.match(r'^\d+[\d\s\.\,]*$', cell_text):
                            exercise_name = cell_text
                            break
            
            if not exercise_name or len(exercise_name) < 3:
                continue
            
            # Build weeks data
            weeks = {}
            if week_cols:
                for week_name, col_idx in week_cols.items():
                    if col_idx < len(row) and row[col_idx]:
                        value = str(row[col_idx]).strip()
                        if value and value.lower() not in ['none', 'null', 'nan', '']:
                            weeks[week_name] = {"weight": value}
            
            # Ensure standard 4-week structure
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
            
            if len(exercises) >= 15:  # Allow more exercises
                break
        
        return exercises
    
    def _parse_dataframe_to_exercises(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Convert DataFrame to exercise list"""
        exercises = []
        
        # Find exercise column
        exercise_col = None
        for col in df.columns:
            col_str = str(col).lower()
            if any(keyword in col_str for keyword in ['esercizio', 'exercise', 'nome', 'name']):
                exercise_col = col
                break
        
        if exercise_col is None and len(df.columns) > 0:
            exercise_col = df.columns[0]  # Use first column as fallback
        
        # Find week columns
        week_cols = {}
        for col in df.columns:
            col_str = str(col).lower()
            if (re.search(r'sett|week|\d+|peso|weight|kg|w\d|settimana', col_str) and 
                col != exercise_col):
                
                week_match = re.search(r'(\d+)', col_str)
                if week_match:
                    week_num = week_match.group(1)
                    week_cols[f"settimana_{week_num}"] = col
                else:
                    week_num = len(week_cols) + 1
                    week_cols[f"settimana_{week_num}"] = col
        
        # Process rows
        for idx, row in df.iterrows():
            if exercise_col and pd.notna(row[exercise_col]):
                exercise_name = str(row[exercise_col]).strip()
                
                if len(exercise_name) < 3 or re.match(r'^\d+[\d\s\.\,]*$', exercise_name):
                    continue
                
                # Build weeks data
                weeks = {}
                for week_name, col in week_cols.items():
                    if pd.notna(row[col]):
                        value = str(row[col]).strip()
                        if value and value.lower() not in ['none', 'null', 'nan', '']:
                            weeks[week_name] = {"weight": value}
                
                # Ensure standard structure
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
                
                if len(exercises) >= 15:
                    break
        
        return exercises
    
    def _extract_page_title(self, text: str, page_num: int) -> str:
        """Extract page title from text"""
        lines = text.split('\n')[:10]
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
            if not line or len(line) < 3:
                continue
                
            # Look for exercise patterns (more comprehensive)
            if any(keyword in line.lower() for keyword in [
                'squat', 'panca', 'stacco', 'press', 'curl', 'row', 'pull',
                'push', 'dip', 'chin', 'lunge', 'dead', 'front', 'back'
            ]) and not re.match(r'^\d+[\d\s\.\,]*$', line):
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
                
                if exercise_count >= 10:
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
    parser = EnhancedPDFParser()
    return parser.parse_pdf(pdf_path)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python enhanced_pdf_parser.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = parsePDF(pdf_path)
    print(json.dumps(result, indent=2))