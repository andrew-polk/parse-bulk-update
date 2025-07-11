import Parse = require('parse/node');
import { config } from 'dotenv';

// Load environment variables
config();

// Initialize Parse
const appId = process.env.PARSE_APP_ID;
const masterKey = process.env.PARSE_MASTER_KEY;
const serverURL = process.env.PARSE_SERVER_URL;

if (!appId || !masterKey || !serverURL) {
  throw new Error('Missing required environment variables: PARSE_APP_ID, PARSE_MASTER_KEY, PARSE_SERVER_URL');
}

Parse.initialize(appId, undefined, masterKey);
(Parse as any).serverURL = serverURL;

async function fixACLForUpdatedBooks(oldUploaderId: string, newUploaderId: string) {
  const Book = Parse.Object.extend('books');

  const newUploader = new Parse.User();
  newUploader.id = newUploaderId;

  // Query for books that have the new uploader but were updated by the bulk script
  const query = new Parse.Query(Book);
  query.equalTo('uploader', newUploader);
  query.equalTo('updateSource', 'bulkUpdateScript');

  let count = 0;

  await query.each(async (book: Parse.Object) => {
    // Update ACL to fix permissions
    const acl = book.getACL() || new Parse.ACL();
    
    // Remove write access for old uploader (if it still exists)
    acl.setWriteAccess(oldUploaderId, false);
    
    // Ensure write access for new uploader
    acl.setWriteAccess(newUploaderId, true);
    
    book.setACL(acl);
    
    await book.save(null, { useMasterKey: true });
    count++;
  }, { useMasterKey: true });

  console.log(`✅ Fixed ACL for ${count} books`);
}

// Get user IDs from environment variables
const oldUploaderId = process.env.OLD_UPLOADER_ID;
const newUploaderId = process.env.NEW_UPLOADER_ID;

if (!oldUploaderId || !newUploaderId) {
  throw new Error('Missing required environment variables: OLD_UPLOADER_ID, NEW_UPLOADER_ID');
}

fixACLForUpdatedBooks(oldUploaderId, newUploaderId)
  .catch(console.error);
