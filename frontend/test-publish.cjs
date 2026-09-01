const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

(async () => {
  const TOKEN = process.argv[2];
  if (!TOKEN) {
    console.log('Usage: node test-publish.js <JWT_TOKEN>');
    process.exit(1);
  }

  const TEST_IMG = path.join(__dirname, '..', 'backend', 'uploads', '1787160390638-e01951b6-215b-4bab-9951-f68d5bff805f.jpeg');
  if (!fs.existsSync(TEST_IMG)) {
    console.log('ERROR: test image not found at:', TEST_IMG);
    process.exit(1);
  }
  const imgBuf = fs.readFileSync(TEST_IMG);
  const imgStat = fs.statSync(TEST_IMG);
  console.log('Test image:', TEST_IMG, '| size:', imgStat.size, 'bytes');

  const BOUNDARY = '----NovarixTestBoundary_' + crypto.randomBytes(8).toString('hex');
  const CRLF = '\r\n';

  const filename = 'test_' + Date.now() + '.jpeg';
  const caption = 'Test publish ' + new Date().toISOString();
  const privacy = 'public';

  const partMedia =
    `--${BOUNDARY}${CRLF}` +
    `Content-Disposition: form-data; name="media"; filename="${filename}"${CRLF}` +
    `Content-Type: image/jpeg${CRLF}${CRLF}`;

  const partCaption =
    `${CRLF}--${BOUNDARY}${CRLF}` +
    `Content-Disposition: form-data; name="caption"${CRLF}${CRLF}${caption}`;

  const partPrivacy =
    `${CRLF}--${BOUNDARY}${CRLF}` +
    `Content-Disposition: form-data; name="privacy"${CRLF}${CRLF}${privacy}`;

  const trailer = `${CRLF}--${BOUNDARY}--${CRLF}`;

  const partMediaBuf = Buffer.from(partMedia, 'utf8');
  const captionBuf = Buffer.from(partCaption, 'utf8');
  const privacyBuf = Buffer.from(partPrivacy, 'utf8');
  const trailerBuf = Buffer.from(trailer, 'utf8');

  const body = Buffer.concat([
    partMediaBuf,
    imgBuf,
    captionBuf,
    privacyBuf,
    trailerBuf,
  ]);

  try {
    const res = await axios.post('http://localhost:5000/api/posts', body, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${BOUNDARY}`,
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Length': body.length,
      },
      timeout: 40000,
    });
    console.log('==================================================');
    console.log('SUCCESS! Status:', res.status, res.statusText);
    console.log('==================================================');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('==================================================');
    console.log('FAILED:', err.message);
    console.log('Status:', err.response?.status || 'none');
    console.log('==================================================');
    console.log('Response data:', JSON.stringify(err.response?.data || null, null, 2));
    if (err.stack && !err.response) console.log('Stack:', err.stack);
  }
})();
