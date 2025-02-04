import mongoose from "mongoose";

// Database connection function
export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 500000, // Increase timeout
    });
    console.log('DB connected');
  } catch (error) {
    console.error('DB connection failed:', error.message);
    process.exit(1); // Exit the process with failure
  }
};

// User schema
const userSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  email: { type: String, required: true, unique: true, match: [/.+@.+\..+/, 'Please enter a valid email'] }, // Email validation
  password: { type: String, required: true },
});

// User model
const userModel = mongoose.model("User", userSchema);

export default userModel;
