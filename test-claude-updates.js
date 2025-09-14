// Test script to verify Claude updates work correctly
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test 1x1 pixel image (smallest valid JPEG)
const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';

async function testClaudeEndpoint() {
  try {
    console.log('🧪 Testing Claude endpoint...');

    const response = await axios.post(`${BASE_URL}/api/test-claude`, {
      imageBase64: testImageBase64
    });

    console.log('✅ Claude test response:');
    console.log('- Prompt:', response.data.result.prompt);
    console.log('- Scene Description:', response.data.result.sceneDescription);
    console.log('- Make Instrumental:', response.data.result.makeInstrumental);
    console.log('- Processing Time:', response.data.result.processingTime + 'ms');

    return response.data.result;
  } catch (error) {
    console.error('❌ Claude test failed:', error.response?.data?.error || error.message);
    return null;
  }
}

async function testSunoEndpoint() {
  try {
    console.log('🧪 Testing Suno endpoint...');

    const response = await axios.post(`${BASE_URL}/api/test-suno`, {
      prompt: 'ambient peaceful music, calm, medium tempo, soft piano, 1-2 minutes',
      makeInstrumental: true
    });

    console.log('✅ Suno test response:');
    console.log('- Clip ID:', response.data.result.id);
    console.log('- Status:', response.data.result.status);
    console.log('- Title:', response.data.result.title);

    return response.data.result;
  } catch (error) {
    console.error('❌ Suno test failed:', error.response?.data?.error || error.message);
    return null;
  }
}

async function testFullPipeline() {
  try {
    console.log('🧪 Testing full pipeline...');

    const response = await axios.post(`${BASE_URL}/api/scene/analyze`, {
      imageBase64: testImageBase64,
      deviceId: 'test-device-' + Date.now(),
      timestamp: new Date().toISOString(),
      mimeType: 'image/jpeg',
      userId: 'test-user'
    });

    console.log('✅ Full pipeline test response:');
    console.log('- Scene Changed:', response.data.sceneChanged);
    console.log('- Prompt:', response.data.prompt);
    console.log('- Scene Description:', response.data.sceneDescription);
    console.log('- Make Instrumental:', response.data.makeInstrumental);
    console.log('- Music URL:', response.data.musicUrl);
    console.log('- Clip ID:', response.data.clipId);

    return response.data;
  } catch (error) {
    console.error('❌ Full pipeline test failed:', error.response?.data?.error || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting tests for Claude updates...\n');

  // Test individual services
  const claudeResult = await testClaudeEndpoint();
  console.log('');

  const sunoResult = await testSunoEndpoint();
  console.log('');

  // Test full pipeline (this will take longer due to music generation)
  console.log('⚠️  Full pipeline test will take 1-3 minutes due to music generation...');
  const pipelineResult = await testFullPipeline();

  console.log('\n📊 Test Summary:');
  console.log('- Claude API:', claudeResult ? '✅ PASSED' : '❌ FAILED');
  console.log('- Suno API:', sunoResult ? '✅ PASSED' : '❌ FAILED');
  console.log('- Full Pipeline:', pipelineResult ? '✅ PASSED' : '❌ FAILED');
}

// Check if server is running first
async function checkHealth() {
  try {
    await axios.get(`${BASE_URL}/api/health`);
    return true;
  } catch (error) {
    console.error('❌ Server is not running. Please start the backend first with: bun run dev');
    return false;
  }
}

async function main() {
  const isHealthy = await checkHealth();
  if (isHealthy) {
    await runTests();
  }
}

main();