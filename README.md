# Parse Bulk Update Scripts

A collection of TypeScript scripts for bulk updating Parse Server data, specifically for transferring book ownership between users.

## Scripts

### `src/scripts/bulk-update.ts`
Main script for bulk updating book uploader and ACL permissions.

**Features:**
- Updates the `uploader` field from old user to new user
- Sets `updateSource` field for tracking changes
- Updates ACL permissions (removes old uploader access, grants new uploader access)
- Uses proper Parse pointer relationships

### `src/scripts/fix-acl.ts`
Utility script to fix ACL permissions for books that were already updated but need ACL corrections.

**Features:**
- Finds books with specific uploader and `updateSource` values
- Fixes ACL permissions for previously updated books
- Removes old uploader write access
- Ensures new uploader has write access

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your Parse Server configuration:
   ```env
   PARSE_APP_ID=your_application_id_here
   PARSE_MASTER_KEY=your_master_key_here
   PARSE_SERVER_URL=https://your-parse-server.com/parse
   OLD_UPLOADER_ID=old_user_id_here
   NEW_UPLOADER_ID=new_user_id_here
   ```

## Usage

### Update books with new uploader and fix ACLs:
```bash
npm start
# or
npx ts-node src/scripts/bulk-update.ts
```

### Fix ACLs for already updated books:
```bash
npx ts-node src/scripts/fix-acl.ts
```

## Configuration

The scripts use the following Parse configuration:
- **Class name**: `books`
- **User relation**: `uploader` field pointing to `_User` table
- **Master key**: Required for bulk operations
