#!/usr/bin/env python3
"""
Script to fix trailing commas in extracted JSON files
"""
import os
import json
import glob

def clean_value(value):
    """Remove trailing comma from value if it's a string"""
    if isinstance(value, str) and value.endswith(','):
        return value[:-1]
    return value

def clean_dict(data_dict):
    """Clean all values in a dictionary"""
    return {k: clean_value(v) for k, v in data_dict.items()}

def fix_json_file(filepath):
    """Fix a JSON file by removing trailing commas from values"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, list):
            cleaned_data = [clean_dict(item) if isinstance(item, dict) else item for item in data]
        elif isinstance(data, dict):
            cleaned_data = clean_dict(data)
        else:
            cleaned_data = data
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Fixed: {filepath}")
        return True
    except Exception as e:
        print(f"✗ Error fixing {filepath}: {e}")
        return False

def main():
    exports_dir = os.path.join(os.path.dirname(__file__), "exports")
    
    if not os.path.exists(exports_dir):
        print("No exports directory found")
        return
    
    # Find all extraction directories
    extraction_dirs = [d for d in glob.glob(os.path.join(exports_dir, "*"))
                      if os.path.isdir(d) and not d.endswith('.zip')]
    
    print(f"Found {len(extraction_dirs)} extraction directories")
    print("-" * 50)
    
    files_to_fix = ['contacts.json', 'sms.json', 'call_log.json']
    fixed_count = 0
    
    for extract_dir in extraction_dirs:
        print(f"\nProcessing: {os.path.basename(extract_dir)}")
        for filename in files_to_fix:
            filepath = os.path.join(extract_dir, filename)
            if os.path.exists(filepath):
                if fix_json_file(filepath):
                    fixed_count += 1
            else:
                print(f"  - {filename} not found (skipping)")
    
    print("\n" + "=" * 50)
    print(f"Fixed {fixed_count} files")

if __name__ == "__main__":
    main()
