import express from 'express';
import multer from 'multer';
import { getInventory, createItem, deleteItem, updateItem, importInventory } from '../controllers/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload as cloudinaryUpload } from '../utils/cloudinary.js'; // <-- Import our Cloudinary Multer Config

const router = express.Router();

// Configure temporary in-memory storage buffer specifically for File Imports (.xlsx, .csv)
const importStorage = multer({ storage: multer.memoryStorage() });

// =========================================================================
// CORE USER ASSET COLLECTION ENDPOINTS
// =========================================================================
router.route('/')
  .get(protect, getInventory)   // Securely fetch active user's records only
  .post(protect, cloudinaryUpload.single('image'), createItem);  // 🔥 Added image upload middleware for creation

// =========================================================================
// FILE PARSING INGESTION TARGET ENDPOINT 
// =========================================================================
// Maps to: POST http://localhost:5000/api/inventory/import
router.route('/import')
  .post(protect, importStorage.single('file'), importInventory); // Keeps 'file' key intact for excel parsing

// =========================================================================
// INDIVIDUAL DOCUMENT LAYOUT DYNAMIC MANAGEMENT HANDLERS
// =========================================================================
router.route('/:id')
  .put(protect, cloudinaryUpload.single('image'), updateItem)   // 🔥 Added image upload middleware for updates
  .delete(protect, deleteItem); // Limit clean erasure privileges to the document's true owner

export default router;