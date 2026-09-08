import User from '../models/User.js';

export const updateUser = async (req, res) => {
    const id = req.params.id;

    try {
        const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });

        res.status(200).json({ success: true, message: 'Successfully updated', data: updatedUser });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update' });
    }
};

export const deleteUser = async (req, res) => {
    const id = req.params.id;

    try {
        await User.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: 'Successfully deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete' });
    }
};

export const getSingleUser = async (req, res) => {
    const id = req.params.id;

    try {
        const user = await User.findById(id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'No user found' });
        }

        res.status(200).json({ success: true, message: 'User found', data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Something went wrong' });
    }
};

export const getAllUser = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');

        res.status(200).json({ success: true, message: 'Users found', data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Something went wrong' });
    }
};

export const getUserProfile = async (req, res) => {
    const id = req.params.id;

    try {
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const { password, ...rest } = user._doc;

        res.status(200).json({ success: true, message: 'Profile info is getting', data: { ...rest } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Something went wrong' });
    }
};


// Controller to get user by ID
export const getUserById = async (req, res) => {
    const { userId } = req.params;
  
    try {
      // Fetch user by ID from the database
      const user = await User.findById(userId);
  
      // If the user doesn't exist, return a 404
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Return the user data
      res.status(200).json(user);
    } catch (error) {
      // Handle errors and return a 500 status code
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  };