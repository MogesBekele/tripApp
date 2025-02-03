import express from "express";
import mongoose from "mongoose";
import userModel from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";

// Create token
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const router = express.Router();

// Register Route
router.post("/register", async (req, res) => {
  const { userName, email, password } = req.body;
  try {
    // Check if user already exists
    const exists = await userModel.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Validate email and password strength
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email" });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new userModel({
      userName,
      email,
      password: hashedPassword,
    });

    const user = await newUser.save();

    // Generate JWT token
    const token = createToken(user._id);

    // Respond with success and token
    return res.status(201).json({ success: true, token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error", error });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await userModel.findOne({ email });
    
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    // Compare the password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    // Generate token
    const token = createToken(user._id);

    // Respond with token
    return res.status(200).json({ success: true, message: "Successfully logged in", token });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error", error });
  }
});


// Token Verification Middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  // Token should be in the form "Bearer <token>"
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. Invalid token format.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Store decoded user info in request object
    next();
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid token.' });
  }
};

// Protected Route
router.get('/home', verifyToken, async (req, res) => {
  try {
    // Find user by ID from token
    const user = await userModel.findOne({ _id: req.user.id });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error", error });
  }
});

export default router;
