import mongoose from "mongoose";

// config/db.js

// Database connection function
export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI,{  serverSelectionTimeoutMS: 50000});
    console.log('DB connected');
  } catch (error) {
    console.error('DB connection failed:', error.message);
  }
};



// User schema
const userSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  email: { type: String, required: true, unique: true, match: [/.+@.+\..+/, 'Please enter a valid email'] }, // Email validation
  password: { type: String, required: true },
});

// User model
const userModel = mongoose.model("user", userSchema);

export default userModel;

