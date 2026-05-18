const http = require('http');

const options = {
  hostname: 'localhost',
  port: 24341,
  path: '/api/dashboard/stats',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('Testing:', `http://${options.hostname}:${options.port}${options.path}`);

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response Body:', JSON.stringify(JSON.parse(data), null, 2));
    console.log('Test completed!');
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e.message);
});

req.setTimeout(5000, () => {
  console.error('Request timed out');
  req.destroy();
});

req.end();
