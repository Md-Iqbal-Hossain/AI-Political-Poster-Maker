import mongoose from 'mongoose';
import { ENV } from './env.js';

export const connectDB = async (): Promise<void> => {
  if (!ENV.MONGODB_URI || ENV.MONGODB_URI.trim() === '') {
    console.error('[MongoDB] Connection error: MONGODB_URI is not set in server/.env');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI);
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error(`[MongoDB] Connection error: ${errorMessage}`);
    
    if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('querySrv')) {
      console.error('[MongoDB Diagnostic] DNS lookup failed. Verify your cluster address in MONGODB_URI or check network/DNS connection.');
    } else if (errorMessage.includes('bad auth') || errorMessage.includes('Authentication failed')) {
      console.error('[MongoDB Diagnostic] Authentication failed. Check database username and password in MONGODB_URI.');
    } else if (errorMessage.includes('MongooseServerSelectionError') || errorMessage.includes('timed out')) {
      console.error('[MongoDB Diagnostic] Server selection / network timeout. If using MongoDB Atlas, check if your current IP address is whitelisted (Network Access in Atlas dashboard).');
    }

    process.exit(1);
  }
};

