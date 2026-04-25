import { chromium } from '@playwright/test';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { seed } from './seed';

dotenv.config({ path: path.join(process.cwd(), '.env.e2e') });

const BASE_URL = 'http://localhost:3000';
const AUTH_DIR = path.join(process.cwd(), 'e2e', '.auth');

async function loginAs(email: string, password: string, outFile: string): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/(owner|trainer|member)(\/|$)/);

  await context.storageState({ path: outFile });
  await browser.close();
}

export default async function globalSetup(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env.e2e');

  // Ensure auth directory exists
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Reset and seed test database
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const collections = await db.listCollections().toArray();
  await Promise.all(collections.map((col) => db.dropCollection(col.name)));
  await seed();
  await mongoose.disconnect();

  // Save auth state for each role
  await loginAs('owner@test.com', 'TestPass123!', path.join(AUTH_DIR, 'owner.json'));
  await loginAs('trainer@test.com', 'TestPass123!', path.join(AUTH_DIR, 'trainer.json'));
  await loginAs('member@test.com', 'TestPass123!', path.join(AUTH_DIR, 'member.json'));
}
