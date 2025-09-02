# 🚀 Make quickstart always rebuild with latest Docker images and add database migration support

## Problem

During customer demos, the quickstart command was using cached Docker images instead of pulling the latest code, leading to outdated functionality being demonstrated. Users expected quickstart to always use the most recent version.

## Solution

- **Always rebuild**: Quickstart now always pulls and builds latest Docker images (like `pnpm run docker:rebuild`)
- **Smart volume management**: Interactive prompts handle database persistence vs fresh start
- **Migration support**: New database migration tool for handling schema changes
- **User safety**: Clear warnings before data loss with multiple options

## Changes Made

### 🔧 New Scripts

- `scripts/docker-quickstart.ts` - Enhanced quickstart with volume management and warnings
- `scripts/docker-migrate.ts` - Database migration tool with backup options

### 📦 New Commands

- `pnpm run quickstart` - Standard quickstart (preserves database by default)
- `pnpm run quickstart:fresh` - Fresh start (removes all existing data)
- `pnpm run quickstart:preserve` - Explicitly preserve database
- `pnpm run docker:migrate` - Database migration tool

### 📚 Documentation

- Updated README with clear explanations of when quickstart updates vs preserves data
- Added migration instructions and safety warnings
- Documented all new command options

## Behavior Changes

**Before:**

- Quickstart used cached Docker images
- No database migration strategy
- No warnings about data loss

**After:**

- ✅ Always rebuilds with latest code
- ✅ Interactive prompts for existing data
- ✅ Database migration tool with backups
- ✅ Clear warnings before data loss
- ✅ Multiple quickstart modes for different scenarios

## Safety Features

- Interactive prompts when existing data detected
- Clear warnings before data loss
- Backup options in migration tool
- Multiple quickstart modes for different use cases

## Testing

- [x] Verified quickstart always rebuilds images
- [x] Tested volume management prompts
- [x] Confirmed migration tool functionality
- [x] Validated documentation accuracy

## Breaking Changes

None - this is backward compatible. Existing users will get interactive prompts for their first run after this change.

## Related Issues

Fixes the issue where customer demos showed outdated functionality due to cached Docker images.
