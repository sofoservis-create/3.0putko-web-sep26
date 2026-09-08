import User from '../models/User.js';
import Accommodation from '../models/Accommodation.js';
import Host from '../models/Host.js';

// Add an accommodation to favorites
export const addFavorite = async (req, res) => {
    try {
        const { userId, accommodationId } = req.body;

        if (!userId || !accommodationId) {
            return res.status(400).json({ error: 'User ID and Accommodation ID are required' });
        }

        // Check if the user exists in either User or Host models
        const user = await User.findById(userId);
        const host = await Host.findById(userId);
        const account = user || host;

        if (!account) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if the accommodation exists
        const accommodation = await Accommodation.findById(accommodationId);
        if (!accommodation) {
            return res.status(404).json({ error: 'Accommodation not found' });
        }

        // Check if the accommodation is already in favorites
        if (account.favorites.includes(accommodationId)) {
            return res.status(400).json({ error: 'Accommodation already in favorites' });
        }

        // Add the accommodation to the user's favorites
        account.favorites.push(accommodationId);
        await account.save();

        res.status(200).json({ message: 'Added to favorites successfully' });
    } catch (error) {
        console.error("Error in addFavorite controller:", error.message);
        res.status(500).json({ error: error.message || 'Server error' });
    }
};

// Remove an accommodation from favorites
export const removeFavorite = async (req, res) => {
    try {
        const { userId, accommodationId } = req.body;

        if (!userId || !accommodationId) {
            return res.status(400).json({ error: 'User ID and Accommodation ID are required' });
        }

        // Check if the user exists in either User or Host models
        const user = await User.findById(userId);
        const host = await Host.findById(userId);
        const account = user || host;

        if (!account) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Remove the accommodation from favorites
        account.favorites = account.favorites.filter(favId => favId.toString() !== accommodationId);
        await account.save();

        res.status(200).json({ message: 'Removed from favorites successfully' });
    } catch (error) {
        console.error("Error in removeFavorite controller:", error.message);
        res.status(500).json({ error: error.message || 'Server error' });
    }
};

// Get all favorite accommodations of the user
export const getFavorites = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Check if the user exists in either User or Host models
        const user = await User.findById(userId).populate('favorites');
        const host = await Host.findById(userId).populate('favorites');
        const account = user || host;

        if (!account) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Access favorites through account (either user or host)
        res.status(200).json({ favorites: account.favorites });
    } catch (error) {
        console.error("Error in getFavorites controller:", error.message);
        res.status(500).json({ error: error.message || 'Server error' });
    }
};

