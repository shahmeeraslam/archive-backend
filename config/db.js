import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is missing inside the active environment configuration matrix.");
    }
    
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`🍃 [Database Handshake] Connected securely to host cluster: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ [Database Error] Core tracking layer connection failed: ${error.message}`);
    // Do not run process.exit(1) on Vercel as it crashes serverless lifecycles completely
  }
};

export default connectDB;