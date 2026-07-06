import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 1. INITIALIZE ENVIRONMENT CONFIGURATIONS FIRST
// This guarantees all subsequent module imports can instantly read your .env keys
dotenv.config();

// 2. CORE RESOURCE & ROUTE IMPORTS 
import connectDB from './config/db.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import billingRoutes from './routes/billing.js';

// 3. EXECUTE CLOUD DATABASE HANDSHAKE
connectDB();

const app = express();

// 4. GLOBAL MIDDLEWARE MATRIX
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// 5. PRIMARY REST ENDPOINTS ENTRYWAY
// ==========================================
app.use('/api/inventory', inventoryRoutes); // Handles all stock and bulk file imports
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);

// ==========================================
// 6. RUNTIME BOOTSTRAP PIPELINE
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🌐 [Runtime Server] Core execution matrix active at http://localhost:${PORT}`);
});