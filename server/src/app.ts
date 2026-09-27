// import express, { Request, Response } from 'express';
// import cors from 'cors';
// import cookieParser from 'cookie-parser';
// import { ENV } from './config/env.js';
// import authRoutes from './routes/auth.routes.js';
// import templateRoutes from './routes/template.routes.js';
// import uploadRoutes from './routes/upload.routes.js';
// import posterRoutes from './routes/poster.routes.js';
// import { connectDB } from './config/db.js';

// const app = express();

// app.use(
//   cors({
//     origin: ENV.CLIENT_URL,
//     credentials: true,
//   })
// );

// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// app.use(cookieParser());

// // Health Check Route
// app.get('/api/health', (_req: Request, res: Response) => {
//   res.status(200).json({
//     status: 'ok',
//     message: 'AI Political Poster Maker API Server is running',
//     timestamp: new Date().toISOString(),
//   });
// });

// app.use(async (_req, _res, next) => {
//   try {
//     await connectDB();
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// // API Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/templates', templateRoutes);
// app.use('/api/uploads', uploadRoutes);
// app.use('/api/posters', posterRoutes);

// export default app;


// *************************************************


import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import templateRoutes from './routes/template.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import posterRoutes from './routes/poster.routes.js';
import { connectDB } from './config/db.js';

const app = express();

app.use(
  cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health Check Route
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'AI Political Poster Maker API Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Temporary MongoDB Test Route
app.get('/api/db-test', async (_req: Request, res: Response) => {
  try {
    await connectDB();

    res.status(200).json({
      status: 'ok',
      message: 'MongoDB connection successful',
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error?.message || 'MongoDB connection failed',
    });
  }
});

app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/posters', posterRoutes);

export default app;