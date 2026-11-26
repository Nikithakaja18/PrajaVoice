const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const dataDir = process.env.PALLE_PRAJA_DATA_DIR || path.join(rootDir, 'data');
const officersPath = path.join(dataDir, 'officers.json');
const envPath = path.join(rootDir, '.env');

function ask(question, hidden = false) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Run this setup command in an interactive terminal so passwords can be entered without echo.');
  }

  return new Promise((resolve, reject) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let value = '';
    const onData = chunk => {
      for (const character of chunk.toString('utf8')) {
        if (character === '\u0003') {
          process.stdin.removeListener('data', onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          reject(new Error('Setup cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          process.stdin.removeListener('data', onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          value = value.slice(0, -1);
          if (!hidden) process.stdout.write('\b \b');
        } else {
          value += character;
          if (!hidden) process.stdout.write(character);
        }
      }
    };
    process.stdin.on('data', onData);
  });
}

function getTokenSecret() {
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, 'utf8');
    const match = existing.match(/^AUTH_TOKEN_SECRET=(.*)$/m);
    const secret = match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
    if (secret && Buffer.byteLength(secret, 'utf8') < 32) {
      throw new Error('.env has an AUTH_TOKEN_SECRET shorter than 32 bytes. Keep it private and replace it before setup.');
    }
    if (secret) return secret;

    const newSecret = crypto.randomBytes(48).toString('hex');
    const nextContents = match
      ? existing.replace(/^AUTH_TOKEN_SECRET=.*$/m, `AUTH_TOKEN_SECRET=${newSecret}`)
      : `${existing}${existing.endsWith('\n') || existing.length === 0 ? '' : '\n'}AUTH_TOKEN_SECRET=${newSecret}\n`;
    fs.writeFileSync(envPath, nextContents, { mode: 0o600 });
    return newSecret;
  }

  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(envPath, `AUTH_TOKEN_SECRET=${secret}\n`, { flag: 'wx', mode: 0o600 });
  return secret;
}

async function main() {
  if (fs.existsSync(officersPath)) {
    throw new Error(`${officersPath} already exists. Use an ADMIN account to register additional officers.`);
  }

  const username = (await ask('Initial ADMIN username: ')).trim();
  if (!username || username.length > 100) {
    throw new Error('Choose a username of at most 100 characters.');
  }
  const password = await ask('Password (minimum 12 characters): ', true);
  if (password.length < 12 || password.length > 256) {
    throw new Error('Password must be between 12 and 256 characters.');
  }
  const confirmation = await ask('Confirm password: ', true);
  if (password !== confirmation) throw new Error('Passwords do not match.');

  getTokenSecret();
  const salt = crypto.randomBytes(16);
  const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');
  const account = {
    username,
    role: 'ADMIN',
    department: null,
    active: true,
    tokenVersion: 0,
    passwordHash: `scrypt$${salt.toString('hex')}$${passwordHash}`
  };
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(officersPath, `${JSON.stringify([account], null, 2)}\n`, {
    flag: 'wx',
    mode: 0o600
  });
  console.log(`Created the first ADMIN identity in ${officersPath}. Keep .env and data/ private.`);
}

main()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
