const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 3007,
  path: '/api/scheduling/appointments',
  method: 'GET',
  headers: {}
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => console.log(data.substring(0, 100)));
});
req.on('error', e => console.error(`problem with request: ${e.message}`));
req.end();
