import { SunoHackMITAPI } from './index';

async function debugSunoAPI() {
  console.log('🔍 Debugging Suno HackMIT API...\n');

  const api = new SunoHackMITAPI();

  try {
    console.log('Testing basic /generate endpoint...');

    const response = await fetch('https://studio-api.prod.suno.com/api/v2/external/hackmit/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUNO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topic: 'test music',
        tags: 'test'
      })
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Response Data:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
    }

  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

debugSunoAPI();