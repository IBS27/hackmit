const express = require('express');
require('dotenv').config(); // For environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Import the route
const sunoRoutes = require('./routes/suno'); // Adjust path as needed

// Use the route
app.use('/api/suno', sunoRoutes);

// Basic health check route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Suno API endpoint: http://localhost:${PORT}/api/suno/check-status`);
});

module.exports = app;