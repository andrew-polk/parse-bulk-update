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
  
  // Fetch user details to get email addresses
  await oldUploader.fetch({ useMasterKey: true });
  await newUploader.fetch({ useMasterKey: true });
  
  const oldUserEmail = oldUploader.get('email') || oldUploader.get('username');
  const newUserEmail = newUploader.get('email') || newUploader.get('username');

  if (!oldUserEmail || !newUserEmail) {
    throw new Error('Could not retrieve email addresses for both users');
  }

  console.log(`Updating from: ${oldUserEmail} to: ${newUserEmail}`);

  const query = new Parse.Query(Book);
  query.equalTo('uploader', oldUploader);

  let count = 0;

  await query.each(async (book: Parse.Object) => {
    book.set('uploader', newUploader);
    book.set('updateSource', 'bulkUpdateScript');
    
    // Update baseUrl field if it contains the old user's email (URL-encoded)
    const baseUrl = book.get('baseUrl');
    if (baseUrl && typeof baseUrl === 'string') {
      const oldUserEmailEncoded = encodeURIComponent(oldUserEmail);
      const newUserEmailEncoded = encodeURIComponent(newUserEmail);
      
      if (baseUrl.includes(oldUserEmailEncoded)) {
        const updatedBaseUrl = baseUrl.replace(oldUserEmailEncoded, newUserEmailEncoded);
        
        // Validation: compare URL structures with emails replaced by placeholder
        const placeholder = '~^PLACEHOLDER^~';
        const originalWithPlaceholder = baseUrl.replace(oldUserEmailEncoded, placeholder);
        const updatedWithPlaceholder = updatedBaseUrl.replace(newUserEmailEncoded, placeholder);
        
        if (originalWithPlaceholder !== updatedWithPlaceholder) {
          console.error(`❌ Validation failed: URL structure changed beyond email replacement`);
          console.error(`Original: ${baseUrl}`);
          console.error(`Updated: ${updatedBaseUrl}`);
          console.error(`Original with placeholder: ${originalWithPlaceholder}`);
          console.error(`Updated with placeholder: ${updatedWithPlaceholder}`);
          throw new Error('baseUrl validation failed - unexpected structural changes detected');
        }
        
        book.set('baseUrl', updatedBaseUrl);
        console.log(`✅ Updated baseUrl:\nold:\t${baseUrl}\nnew:\t${updatedBaseUrl}`);
      } else if (baseUrl.includes(oldUserEmail)) {
        // Unexpected case: email is not URL-encoded in the baseUrl
        console.error(`❌ Unexpected case: found non-encoded email in baseUrl: ${baseUrl}`);
        throw new Error('baseUrl contains non-encoded email - this case is not supported');
      } else {
        console.log(`⚠️ baseUrl does not contain old user's email:\n\t${baseUrl}`);
      }
    }
    
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
