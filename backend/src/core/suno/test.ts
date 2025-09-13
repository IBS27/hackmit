import { sunoAPI } from './index';

async function testSunoHackMITAPI() {
  console.log('🎵 Testing Suno HackMIT API...\n');

  try {
    // Test 1: Generate music with topic
    console.log('1. Testing generateMusicWithTopic...');
    const topicResult = await sunoAPI.generateMusicWithTopic('peaceful morning coffee', {
      tags: 'acoustic, calm, coffee shop',
      make_instrumental: false
    });
    console.log(`   ✅ Generated clip: ${topicResult.id}`);
    console.log(`   Request ID: ${topicResult.request_id}`);
    console.log(`   Status: ${topicResult.status}`);
    console.log(`   Tags: ${topicResult.metadata.tags}\n`);

    // Test 2: Check clip status using /clips endpoint
    console.log('2. Testing getClip...');
    const clipStatus = await sunoAPI.getClip(topicResult.id);
    console.log(`   ✅ Clip status: ${clipStatus.status}`);
    console.log(`   Audio URL: ${clipStatus.audio_url || 'Not ready yet'}`);
    console.log(`   Created: ${clipStatus.created_at}\n`);

    // Test 3: Generate with tags only
    console.log('3. Testing generateMusicWithTags...');
    const tagsResult = await sunoAPI.generateMusicWithTags(['jazz', 'smooth', 'piano']);
    console.log(`   ✅ Generated clip: ${tagsResult.id}`);
    console.log(`   Status: ${tagsResult.status}\n`);

    // Test 4: Generate with both topic and tags
    console.log('4. Testing combined topic and tags...');
    const combinedResult = await sunoAPI.generateMusicWithTags(
      ['electronic', 'upbeat'],
      'energetic workout session'
    );
    console.log(`   ✅ Generated clip: ${combinedResult.id}`);
    console.log(`   Description: ${combinedResult.metadata.gpt_description_prompt}\n`);

    // Test 5: Test getClips with multiple IDs
    console.log('5. Testing getClips with multiple IDs...');
    const multipleClips = await sunoAPI.getClips([topicResult.id, tagsResult.id]);
    console.log(`   ✅ Retrieved ${multipleClips.length} clips`);
    multipleClips.forEach((clip, index) => {
      console.log(`   Clip ${index + 1}: ${clip.id} - ${clip.status}`);
    });
    console.log('');

    console.log('🎉 All tests passed! Both /generate and /clips endpoints working correctly.');
    console.log('\n💡 Usage tips:');
    console.log('   - Each generate call returns a single clip object');
    console.log('   - Use clip.id to track generation progress');
    console.log('   - Check clip.status for generation state');
    console.log('   - Use generateAndWait() for complete audio with polling');

  } catch (error) {
    console.error('❌ Test failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('HTTP 401')) {
        console.log('💡 Check if SUNO_API_KEY is correct');
      } else if (error.message.includes('HTTP 403')) {
        console.log('💡 API key may not have access to HackMIT endpoints');
      } else if (error.message.includes('SUNO_API_KEY')) {
        console.log('💡 Make sure SUNO_API_KEY is set in your .env file');
      }
    }
  }
}

async function demonstrateUsage() {
  console.log('\n📖 Suno HackMIT API Usage Examples:\n');

  console.log('// Generate music with topic');
  console.log('const clip = await sunoAPI.generateMusicWithTopic("sunset beach", {');
  console.log('  tags: "relaxing, acoustic guitar",');
  console.log('  make_instrumental: false');
  console.log('});');
  console.log('console.log(clip.id, clip.status);\n');

  console.log('// Generate music with tags');
  console.log('const clip = await sunoAPI.generateMusicWithTags(');
  console.log('  ["rock", "energetic", "electric guitar"],');
  console.log('  "epic battle scene"');
  console.log(');\n');

  console.log('// Generate and wait for completion');
  console.log('const completedClip = await sunoAPI.generateAndWait({');
  console.log('  topic: "energetic workout music",');
  console.log('  tags: "electronic, upbeat"');
  console.log('});');
  console.log('console.log(completedClip.audio_url);\n');
}

if (require.main === module) {
  demonstrateUsage();
  testSunoHackMITAPI();
}

export { testSunoHackMITAPI, demonstrateUsage };