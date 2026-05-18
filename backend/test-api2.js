const http = require('http');

const testPaths = [
  '/api/test-direct',
  '/api/health',
  '/api/renewal-calendar'
];

async function testPath(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 24341,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          path: path,
          status: res.statusCode,
          data: data.substring(0, 100)
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        path: path,
        status: 'error',
        error: e.message
      });
    });

    req.setTimeout(3000, () => {
      req.destroy();
      resolve({
        path: path,
        status: 'timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing API paths...\n');
  
  for (const path of testPaths) {
    const result = await testPath(path);
    console.log(`${path}: ${result.status}`);
    if (result.data) {
      console.log(`  Response: ${result.data}`);
    }
  }
}

runTests();
