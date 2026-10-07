import { randomBytes } from 'node:crypto';
import { writeFile, readFile, appendFile, chmod } from 'node:fs/promises';
const secret = () => randomBytes(32).toString('hex');
const channelSecrets = ['MOCK_ALPHA_TOKEN','MOCK_BETA_TOKEN'];
const seedSecrets = ['ALPHA_ADMIN','BETA_ADMIN','CHAT_ANNA','SALES_BINH','SALES_CHI','READ_ONLY'].map(user=>`SEED_${user}_PASSWORD`);
const contents = [
  '# Local development only. Generated credentials; do not commit.',
  'APP_ENV=development', 'APP_ORIGIN=http://localhost:8080',
  'MYSQL_DATABASE=agentic_crm', 'MYSQL_USER=crm_app',
  `MYSQL_PASSWORD=${secret()}`, `MYSQL_ROOT_PASSWORD=${secret()}`,
  'MYSQL_AUTH_USER=crm_auth', `MYSQL_AUTH_PASSWORD=${secret()}`,
  'MYSQL_MIGRATION_USER=crm_migrate', `MYSQL_MIGRATION_PASSWORD=${secret()}`,
  `SESSION_ENCRYPTION_KEY=${secret()}`, `AUTH_DEMO_PASSWORD=${secret()}`,
  ...channelSecrets.map(name=>`${name}=${secret()}`), ...seedSecrets.map(name=>`${name}=${secret()}`), '',
].join('\n');
try {
  await writeFile('.env', contents, { flag: 'wx', mode: 0o600 });
  console.log('Created private .env. Credentials are not printed.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  const existing = await readFile('.env', 'utf8');
  const additions = [];
  if (!/^MYSQL_AUTH_USER=/m.test(existing)) additions.push('MYSQL_AUTH_USER=crm_auth');
  if (!/^MYSQL_AUTH_PASSWORD=/m.test(existing)) additions.push(`MYSQL_AUTH_PASSWORD=${secret()}`);
  if (!/^MYSQL_MIGRATION_USER=/m.test(existing)) additions.push('MYSQL_MIGRATION_USER=crm_migrate');
  if (!/^MYSQL_MIGRATION_PASSWORD=/m.test(existing)) additions.push(`MYSQL_MIGRATION_PASSWORD=${secret()}`);
  for (const name of ['SESSION_ENCRYPTION_KEY', 'AUTH_DEMO_PASSWORD', ...seedSecrets, ...channelSecrets]) {
    if (!new RegExp(`^${name}=`, 'm').test(existing)) additions.push(`${name}=${secret()}`);
  }
  if (additions.length) await appendFile('.env', '\n' + additions.join('\n') + '\n');
  await chmod('.env', 0o600);
  console.log('Kept existing credentials; added missing local settings if needed.');
}
