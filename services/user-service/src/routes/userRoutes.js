// src/routes/userRoutes.js
import express from 'express';
import { userController } from '../controllers/userController.js'

const router = express.Router();

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUser);
router.post('/:id/adjust-score', userController.adjustScore);

export default router;