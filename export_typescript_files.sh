#!/bin/bash

# Create typescript_files.txt with a header
cat > typescript_files.txt << 'EOL'
# SLUMBER SYNTHESIZER TYPESCRIPT FILES
# Combined on $(date)
# ======================================

EOL

# Function to add a file with a header
add_file() {
    echo -e "\n\n# ======================================" >> typescript_files.txt
    echo "# FILE: $1" >> typescript_files.txt
    echo "# ======================================\n" >> typescript_files.txt
    cat "$1" >> typescript_files.txt
}

# Find all TypeScript files and add them
find src -type f -name "*.ts" -o -name "*.tsx" | while read -r file; do
    add_file "$file"
done

# Add package.json and tsconfig.json
add_file "package.json"
add_file "tsconfig.json"

echo "All TypeScript files have been combined into typescript_files.txt" 