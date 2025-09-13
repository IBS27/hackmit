async function testClipsEndpoint() {
  console.log('🔍 Testing /clips endpoint structure...\n');

  const apiKey = process.env.SUNO_API_KEY;
  const baseUrl = 'https://studio-api.prod.suno.com/api/v2/external/hackmit';

  // First generate a clip to test with
  console.log('1. Generating a test clip...');
  const generateResponse = await fetch(`${baseUrl}/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      topic: 'test clip for endpoint testing',
      tags: 'test'
    })
  });

  const clip = await generateResponse.json();
  console.log(`   Generated clip: ${clip.id}\n`);

  // Test different /clips endpoint variations
  const testEndpoints = [
    '/clips',
    `/clips?clip_id=${clip.id}`,
    `/clips/${clip.id}`,
    '/clips?ids=' + clip.id,
    '/clips?id=' + clip.id
  ];

  for (const endpoint of testEndpoints) {
    try {
      console.log(`Testing: ${baseUrl}${endpoint}`);

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`  Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Response:`, JSON.stringify(data, null, 2));
        console.log('');
        break; // Found working endpoint
      } else {
        const errorText = await response.text();
        console.log(`  ❌ Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`  💥 Request failed: ${error}`);
    }
    console.log('');
  }

  // Also test with POST method
  console.log('Testing POST /clips...');
  try {
    const response = await fetch(`${baseUrl}/clips`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ clip_id: clip.id })
    });

    console.log(`Status: ${response.status}`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ POST Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ POST failed:', await response.text());
    }
  } catch (error) {
    console.log('💥 POST error:', error);
  }
}

testClipsEndpoint();