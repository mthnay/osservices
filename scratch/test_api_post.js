import jwt from 'jsonwebtoken';
import http from 'http';

const JWT_SECRET = 'troy-fallback-secret-key-2026';

// Let's create a token for a StoreManager: Burak Öztufanlar
// StoreId: 1777101729941
const token = jwt.sign(
    { id: 'u1777102203376', email: 'burak@oss.com', role: 'StoreManager', storeId: 1777101729941 },
    JWT_SECRET,
    { expiresIn: '1h' }
);

const postData = JSON.stringify({
    storeId: 1777101729941,
    userId: 'u1777101776508',
    userName: 'Faik Can Öz',
    date: '2026-05-24',
    startTime: '09:00',
    endTime: '18:00',
    shiftType: 'Tam Gün',
    notes: 'Test API shift'
});

const options = {
    hostname: '127.0.0.1',
    port: 5001,
    path: '/api/store-shifts',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding('utf8');
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });
    res.on('end', () => {
        console.log(`BODY: ${body}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();
