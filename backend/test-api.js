const http = require('http');

const options = {
  hostname: 'localhost',
  port: 24341,
  path: '/api/health',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('Testing:', `http://${options.hostname}:${options.port}${options.path}`);

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response Body:', data);
    console.log('Test completed!');
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e.message);
  console.error('Error Stack:', e.stack);
});

req.setTimeout(5000, () => {
  console.error('Request timed out');
  req.destroy();
});

req.end();
