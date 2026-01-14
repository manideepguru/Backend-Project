import dotenv from 'dotenv';
import connectDB from './db/index.js';
import express from 'express';

dotenv.config({path: './.env'});

connectDB()
.then(() => {
  const app = express();
  const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error("Failed to start server:", error);
});