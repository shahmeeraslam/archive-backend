import express from 'express';
import multer from 'multer';
import { getInventory, createItem, deleteItem, updateItem, importInventory } from '../controllers/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure temporary in-memory storage buffer for file imports
const upload = multer({ storage: multer.memoryStorage() });

// Core user asset collection endpoints
router.route('/')
  .get(protect, getInventory)   // Securely fetch active user's records only
  .post(protect, createItem);  // Bind newly generated items to the active user

// File parsing ingestion target endpoint 
// Maps to: POST http://localhost:5000/api/inventory/import
router.route('/import')
  .post(protect, upload.single('file'), importInventory); 

// Individual document layout dynamic management handlers
router.route('/:id')
  .put(protect, updateItem)
  .delete(protect, deleteItem); // Limit clean erasure privileges to the document's true owner

export default router;