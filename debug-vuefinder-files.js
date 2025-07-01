import { getStore } from '@netlify/blobs';
import 'dotenv/config';

async function debugVueFinderFiles() {
  console.log('🔍 Debugging VueFinder File Storage...\n');
  console.log('🔧 Environment check:');
  console.log('   NETLIFY_SITE_ID:', process.env.NETLIFY_SITE_ID ? '✅ Set' : '❌ Missing');
  console.log('   NETLIFY_AUTH_TOKEN:', process.env.NETLIFY_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
  console.log('');
  
  try {
    // Get the store using our helper
    const store = getStore({
        name: 'vuefinder-files',
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_AUTH_TOKEN,
    });
    console.log('✅ Store created successfully');
    
    // List all blobs in the store
    console.log('📦 All blobs in vuefinder-files store:');
    const { blobs } = await store.list();
    
    if (blobs.length === 0) {
      console.log('   ❌ No blobs found in store');
    } else {
      console.log(`   ✅ Found ${blobs.length} blobs:`);
      blobs.forEach((blob, index) => {
        console.log(`   ${index + 1}. Key: "${blob.key}"`);
        console.log(`      Metadata:`, blob.metadata || 'None');
        console.log(`      ETag: ${blob.etag}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    console.log('\n💡 Make sure you have set the following environment variables:');
    console.log('   NETLIFY_SITE_ID=your_site_id');
    console.log('   NETLIFY_AUTH_TOKEN=your_auth_token');
  }
}

// Run the debug
debugVueFinderFiles(); 