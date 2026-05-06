// src/app.js
import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Mount Routes
app.use('/api/v1/users', userRoutes);

export default app;
