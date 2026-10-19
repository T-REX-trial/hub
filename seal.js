// Encrypts files for the T-REX hub with AES-256-GCM (Node built-in crypto, no packages).
// Output layout, read by the browser with WebCrypto: 12-byte IV | ciphertext | 16-byte tag.
const fs = require('fs');
const crypto = require('crypto');
const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const j of jobs) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', Buffer.from(j.key, 'hex'), iv);
  const body = Buffer.concat([c.update(fs.readFileSync(j.in)), c.final()]);
  fs.writeFileSync(j.out, Buffer.concat([iv, body, c.getAuthTag()]));
}
