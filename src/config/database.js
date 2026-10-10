import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

let connecting;

export const connectDb = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (!connecting) {
    connecting = mongoose.connect(env.mongoUri);
  }
  await connecting;
  logger.info('MongoDB connected');
  return mongoose.connection;
};

export const disconnectDb = () => mongoose.disconnect();

export default mongoose;
