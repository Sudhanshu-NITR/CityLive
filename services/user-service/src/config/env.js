// src/config/env.js
import dotenv from 'dotenv'

dotenv.config()

export const config = {
    PORT: process.env.PORT || 8082,
    NODE_ENV: process.env.NODE_ENV || 'development',
};