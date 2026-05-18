const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

app.listen(24345, () => {
  console.log('Test server running on port 24345');
});
