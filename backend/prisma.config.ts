import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

export default defineConfig({
  schema: 'prisma',
});
