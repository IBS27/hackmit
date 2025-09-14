const fetch = require('node-fetch');
const fs = require('fs');

// Convert the uploaded image to base64
async function testSceneAnalyze() {
  // Using a simple base64 encoded test image (1x1 pixel PNG)
  const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

  const requestBody = {
    "userId": "test-user-123",
    "timestamp": new Date().toISOString(),
    "photo": {
      "filename": "restaurant-test.png",
      "size": 1024000,
      "mimeType": "image/png",
      "data": testImageBase64
    },
    "action": "analyze_scene"
  };

  try {
    console.log('Making API call to /api/scene/analyze...');
    const response = await fetch('http://localhost:3001/api/scene/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      try {
        const json = JSON.parse(responseText);
        console.log('Parsed JSON response:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Response is not JSON');
      }
    }
  } catch (error) {
    console.error('Error making API call:', error.message);
  }
}

testSceneAnalyze();