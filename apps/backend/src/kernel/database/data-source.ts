import 'reflect-metadata';
import { DataSource } from 'typeorm';
export function databaseSource(migration = false): DataSource {
  const required = (key: string) => { const value = process.env[key]; if (!value) throw new Error(`Missing ${key}`); return value; };
  return new DataSource({
    type: 'mysql', host: required('MYSQL_HOST'),
    port: Number(process.env.MYSQL_PORT ?? 3306), database: required('MYSQL_DATABASE'),
    username: required(migration ? 'MYSQL_MIGRATION_USER' : 'MYSQL_USER'),
    password: required(migration ? 'MYSQL_MIGRATION_PASSWORD' : 'MYSQL_PASSWORD'),
    synchronize: false, migrationsRun: false, logging: false, timezone: 'Z',
    supportBigNumbers: true, bigNumberStrings: true, charset: 'utf8mb4',
    extra: { connectionLimit: 5, connectTimeout: 5000 },
  });
}
