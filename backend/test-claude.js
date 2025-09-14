const fs = require('fs');
const { claudeService } = require('./src/core/claude/index.ts');

async function test() {
  try {
    console.log('Testing Claude service...');

    // Read and convert image to base64
    const imagePath = '/Users/zayyanzafaressani/Desktop/hackmit/hackmit/0ED18EC0-384D-463C-BF02-3EA0555CA274_1_105_c.jpeg';
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const result = await claudeService.generateMusicFromImage(base64Image);
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();