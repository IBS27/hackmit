import { sunoAPI } from './index';

async function waitAndGetURLs() {
  console.log('🎵 Generating music and waiting for URLs...\n');

  try {
    // Generate a new clip and wait for completion
    console.log('1. Generating new music...');
    const clip = await sunoAPI.generateMusicWithTopic('upbeat electronic dance music', {
      tags: 'electronic, energetic, dance',
      make_instrumental: false
    });

    console.log(`   ✅ Generated clip: ${clip.id}`);
    console.log(`   Status: ${clip.status}\n`);

    // Wait for completion with shorter polling interval
    console.log('2. Waiting for completion (this may take 1-2 minutes)...');

    let attempts = 0;
    const maxAttempts = 60; // 2 minutes with 2-second intervals

    while (attempts < maxAttempts) {
      const updatedClip = await sunoAPI.getClip(clip.id);
      console.log(`   Attempt ${attempts + 1}: Status = ${updatedClip.status}`);

      if (updatedClip.status === 'complete') {
        console.log('\n🎉 Generation completed!');
        console.log(`📱 Clip ID: ${updatedClip.id}`);
        console.log(`🎵 Audio URL: ${updatedClip.audio_url}`);
        console.log(`🎬 Video URL: ${updatedClip.video_url || 'N/A'}`);
        console.log(`🖼️  Image URL: ${updatedClip.image_url || 'N/A'}`);
        console.log(`📝 Title: ${updatedClip.title || 'Untitled'}`);
        console.log(`🏷️  Tags: ${updatedClip.metadata.tags}`);
        console.log(`📅 Created: ${updatedClip.created_at}`);
        return updatedClip;
      } else if (updatedClip.status === 'error') {
        console.log(`❌ Generation failed: ${updatedClip.error_message}`);
        return null;
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }

    console.log('⏰ Timeout reached. Generation may still be in progress.');
    const finalClip = await sunoAPI.getClip(clip.id);
    console.log(`Final status: ${finalClip.status}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

waitAndGetURLs();