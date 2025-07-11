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

async function updateUploader(oldUploaderId: string, newUploaderId: string) {
  const Book = Parse.Object.extend('books');

  const oldUploader = new Parse.User();
  oldUploader.id = oldUploaderId;

  const newUploader = new Parse.User();
  newUploader.id = newUploaderId;

  const query = new Parse.Query(Book);
  query.equalTo('uploader', oldUploader);

  let count = 0;

  await query.each(async (book: Parse.Object) => {
    book.set('uploader', newUploader);
    book.set('updateSource', 'bulkUpdateScript');
    
    // This portion has not been tested as is. I forgot about the need
    // for this until after I had already changed the uploader.
    // See fixACL.ts for what I ran to fix the ACLs.
    {
        // Update ACL to give write permission to new uploader
        const acl = book.getACL() || new Parse.ACL();
        
        // Remove write access for old uploader
        acl.setWriteAccess(oldUploaderId, false);
        
        // Grant write access to new uploader
        acl.setWriteAccess(newUploaderId, true);
        
        book.setACL(acl);
    }
    
    await book.save(null, { useMasterKey: true });
    count++;
  }, { useMasterKey: true });

  console.log(`✅ Updated ${count} books`);
}

// Get user IDs from environment variables
const oldUploaderId = process.env.OLD_UPLOADER_ID;
const newUploaderId = process.env.NEW_UPLOADER_ID;

if (!oldUploaderId || !newUploaderId) {
  throw new Error('Missing required environment variables: OLD_UPLOADER_ID, NEW_UPLOADER_ID');
}

updateUploader(oldUploaderId, newUploaderId)
  .catch(console.error);
