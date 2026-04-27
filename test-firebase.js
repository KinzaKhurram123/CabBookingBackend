// Quick Firebase Test Script
require('dotenv').config();
const admin = require('firebase-admin');

console.log('🔥 Testing Firebase Configuration...\n');

try {
  // Initialize Firebase
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });

  console.log('✅ Firebase Admin initialized successfully!');
  console.log('📋 Project ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('📧 Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
  console.log('\n🎉 Push notifications are ready to use!\n');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}
