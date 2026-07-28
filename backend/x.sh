#!/bin/bash

OUTPUT_FILE="all_python_code.txt"

# Clear old output file
> "$OUTPUT_FILE"

# Write command output at top
echo "==============================" >> "$OUTPUT_FILE"
echo "COMMAND OUTPUT" >> "$OUTPUT_FILE"
echo "==============================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Directory structure
tree -I 'venv|__pycache__|.git' >> "$OUTPUT_FILE"

echo "" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Write all Python files except venv
find . \
    -path "./venv" -prune -o \
    -path "./__pycache__" -prune -o \
    -path "./.git" -prune -o \
    -type f -name "*.py" -print | while read -r file
do
    echo "==============================" >> "$OUTPUT_FILE"
    echo "FILE: $file" >> "$OUTPUT_FILE"
    echo "==============================" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    cat "$file" >> "$OUTPUT_FILE"

    echo "" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

echo "[OK] Written to $OUTPUT_FILE"
