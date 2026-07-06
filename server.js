import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 1. INITIALIZE ENVIRONMENT CONFIGURATIONS FIRST
dotenv.config();

// 2. CORE RESOURCE & ROUTE IMPORTS 
import connectDB from './config/db.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import billingRoutes from './routes/billing.js';

// 3. EXECUTE CLOUD DATABASE HANDSHAKE
connectDB();

const app = express();

// 4. GLOBAL MIDDLEWARE MATRIX & MANUAL PREFLIGHT INTERCEPTION
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://shop-inventory-web.vercel.app'
];

// Manual Preflight Header Injection & OPTIONS Interception
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle browser OPTIONS preflight request immediately before it hits endpoints
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Fallback standard CORS configurations
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// 5. PRIMARY REST ENDPOINTS ENTRYWAY
// ==========================================
app.use('/api/inventory', inventoryRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/billing', billingRoutes);

// ==========================================
// 6. RUNTIME BOOTSTRAP PIPELINE
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🌐 [Runtime Server] Core execution matrix active at http://localhost:${PORT}`);
});