// import app from './app.js';
// import { ENV } from './config/env.js';
// import { connectDB } from './config/db.js';

// const PORT = ENV.PORT;

// const startServer = async () => {
//   await connectDB();
//   app.listen(PORT, () => {
//     console.log(`[Server] Running in ${ENV.NODE_ENV} mode on port ${PORT}`);
//   });
// };

// startServer().catch((err) => {
//   console.error('[Server] Failed to start:', err);
// });


import app from './app.js';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  await connectDB();
};

startServer().catch((err) => {
  console.error('[Server] Failed to connect to database:', err);
});

export default app;