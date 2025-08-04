#!/bin/bash

# Fix shell script permissions
# This script ensures all .sh files in the scripts directory have execute permissions

echo "🔧 Fixing shell script permissions..."

# Method 1: Use find if available (more precise)
if command -v find >/dev/null 2>&1; then
    FIXED_COUNT=$(find scripts -name "*.sh" -type f ! -perm +111 -exec chmod +x {} \; -print 2>/dev/null | wc -l)
    if [ "$FIXED_COUNT" -gt 0 ]; then
        echo "✅ Fixed execute permissions on $FIXED_COUNT shell script(s)."
    else
        echo "✅ All shell scripts already have execute permissions."
    fi
else
    # Method 2: Fallback for systems without find
    chmod +x scripts/*.sh 2>/dev/null || true
    echo "✅ Execute permissions applied to all shell scripts."
fi

echo "📋 Current script permissions:"
ls -la scripts/*.sh
