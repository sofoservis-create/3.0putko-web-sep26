import express from 'express';
import { addFavorite, removeFavorite, getFavorites } from '../Controllers/FavoriteController.js';

const router = express.Router();

// Add an accommodation to favorites
router.post('/add', addFavorite);

// Remove an accommodation from favorites
router.delete('/remove/:accommodationId',  removeFavorite);

// Get all favorite accommodations of the logged-in user
router.get('/my-favorites',  getFavorites);

export default router;
