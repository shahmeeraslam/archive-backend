import mongoose from 'mongoose';

// Track execution context connection states across stateless serverless instances
let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('🔄 [Database Server] Reusing active MongoDB connection pool.');
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGO_URI);
    
    // Evaluate the primary connection readyState code index
    isConnected = db.connections[0].readyState;
    console.log(`⚡ [Database Server] MongoDB Atlas Connected: ${db.connection.host}`);
  } catch (error) {
    console.error(`❌ [Database Server] Critical state handshake refusal: ${error.message}`);
    // CRITICAL: Do not invoke process.exit(1) on serverless workers.
    // Instead, let the lifecycle worker naturally retry the database handshakes on subsequent traffic requests.
  }
};

export default connectDB;