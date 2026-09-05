const http = require('http');

function makeRequest(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('--- TESTING WALLET & PAYMENT ENDPOINTS ---');
  // 1. Login as patient bulbul
  const loginRes = await makeRequest('/auth/login', 'POST', {
    identifier: 'bulbul',
    password: 'password123',
  });
  console.log('Login Response:', loginRes.data);

  if (!loginRes.data || !loginRes.data.token) {
    console.error('Failed to log in as patient bulbul');
    return;
  }
  const token = loginRes.data.token;

  // 2. Get initial wallet balance
  const balRes = await makeRequest('/wallet/balance', 'GET', null, token);
  console.log('Current Wallet Balance:', balRes.data);

  // 3. Create payment order
  const orderRes = await makeRequest('/wallet/recharge/create-order', 'POST', { amount: 500 }, token);
  console.log('Create Order Response:', orderRes.data);

  // 4. Verify payment
  const orderId = orderRes.data?.data?.order_id || `order_${Date.now()}`;
  const verifyRes = await makeRequest('/wallet/recharge/verify', 'POST', {
    razorpay_order_id: orderId,
    razorpay_payment_id: `pay_${Date.now()}`,
    razorpay_signature: `sig_${Date.now()}_test`,
    amount: 500,
  }, token);
  console.log('Verify Payment Response:', verifyRes.data);

  // 5. Get updated wallet balance
  const updatedBalRes = await makeRequest('/wallet/balance', 'GET', null, token);
  console.log('Updated Wallet Balance:', updatedBalRes.data);
}

run();
