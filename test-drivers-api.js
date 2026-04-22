const axios = require('axios');

async function testDriversAPI() {
  try {
    console.log('🔍 Testing drivers API endpoint...');
    
    const baseURL = 'https://krystal-imaginable-hurtlingly.ngrok-free.dev';
    const endpoint = '/api/admin/drivers?page=1&limit=100';
    
    // You'll need to get a valid admin token first
    // For now, let's test without auth to see the error
    
    const response = await axios.get(baseURL + endpoint, {
      headers: {
        'Content-Type': 'application/json',
        // Add your admin token here:
        // 'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('📊 Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ API Error:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testDriversAPI();