import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try loading .env from current directory first, then fallback to server/.env if running from root
const envPathInCwd = path.resolve(process.cwd(), '.env');
const envPathInServer = path.resolve(process.cwd(), 'server', '.env');

if (fs.existsSync(envPathInCwd)) {
  dotenv.config({ path: envPathInCwd });
} else if (fs.existsSync(envPathInServer)) {
  dotenv.config({ path: envPathInServer });
} else {
  dotenv.config();
}


export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    API_KEY: process.env.CLOUDINARY_API_KEY || '',
    API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  },
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
};


