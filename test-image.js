// Quick test script to generate a simple base64 image for testing
const fs = require('fs');

// Create a simple 100x100 red square as a test image
const canvas = require('canvas');
const { createCanvas } = canvas;

const canvasElement = createCanvas(100, 100);
const ctx = canvasElement.getContext('2d');

// Fill with red color
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 100, 100);

// Add some text
ctx.fillStyle = 'white';
ctx.font = '20px Arial';
ctx.fillText('TEST', 30, 60);

// Convert to buffer and then base64
const buffer = canvasElement.toBuffer('image/png');
const base64 = buffer.toString('base64');

console.log('Base64 image length:', base64.length);
console.log('First 100 chars:', base64.substring(0, 100));

// Test payload
const payload = {
  imageBase64: base64,
  deviceId: 'test_device_001',
  timestamp: new Date().toISOString(),
  mimeType: 'image/png',
  userId: 'test_user'
};

console.log('Test payload ready:', JSON.stringify({...payload, imageBase64: payload.imageBase64.substring(0, 20) + '...'}));