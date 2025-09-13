import { sunoAPI } from './index';

async function testSunoMethods() {
  console.log('🎵 Testing Suno API Implementation\n');

  try {
    console.log('1. Testing generateMusicWithTopic:');
    const topicResult = await sunoAPI.generateMusicWithTopic('peaceful forest morning', {
      tags: 'ambient, nature sounds, peaceful',
      make_instrumental: false,
      model: 'chirp-v4'
    });
    console.log(`   Generated ${topicResult.data?.length || 0} tracks for topic\n`);

    console.log('2. Testing generateMusicWithTags:');
    const tagsResult = await sunoAPI.generateMusicWithTags(
      ['electronic', 'upbeat', 'synthwave'],
      'driving through neon city',
      { make_instrumental: true }
    );
    console.log(`   Generated ${tagsResult.data?.length || 0} tracks with tags\n`);

    console.log('3. Testing custom generation:');
    const customResult = await sunoAPI.customGenerate({
      prompt: 'A jazz fusion piece with saxophone solo',
      tags: 'jazz fusion, saxophone, smooth',
      model: 'chirp-v4-5',
      custom_mode: true
    });
    console.log(`   Generated ${customResult.data?.length || 0} custom tracks\n`);

    console.log('4. Testing lyrics generation:');
    const lyricsResult = await sunoAPI.generateLyrics('A song about overcoming challenges');
    console.log(`   Generated lyrics: "${lyricsResult.title}"\n`);

    console.log('5. Testing API limit check:');
    const limitResult = await sunoAPI.getLimit();
    console.log(`   Credits remaining: ${limitResult.credits_left}/${limitResult.monthly_limit}\n`);

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
  }
}

async function demonstrateUsage() {
  console.log('📖 Suno API Usage Examples:\n');

  console.log('// Basic topic-based generation');
  console.log('const result = await sunoAPI.generateMusicWithTopic("sunset beach", {');
  console.log('  tags: "relaxing, acoustic guitar, waves"');
  console.log('});\n');

  console.log('// Tags-based generation');
  console.log('const result = await sunoAPI.generateMusicWithTags(');
  console.log('  ["rock", "energetic", "electric guitar"],');
  console.log('  "epic battle scene"');
  console.log(');\n');

  console.log('// Custom generation with full control');
  console.log('const result = await sunoAPI.customGenerate({');
  console.log('  prompt: "Classical piano piece in minor key",');
  console.log('  tags: "classical, piano, melancholic",');
  console.log('  model: "chirp-v4-5",');
  console.log('  make_instrumental: true');
  console.log('});\n');
}

if (require.main === module) {
  demonstrateUsage();

  console.log('⚠️  To run actual tests, ensure SUNO_API_URL and SUNO_API_KEY are configured');
  console.log('💡 Uncomment the line below to test with real API calls:');
  console.log('// testSunoMethods();');
}

export { testSunoMethods, demonstrateUsage };