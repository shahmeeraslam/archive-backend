import express from 'express';
import { createInvoice, getBillingHistory } from '../controllers/billingController.js'; 
import { protect } from '../middleware/authMiddleware.js'; // <-- ADDED: Path to your core auth middleware

const router = express.Router();

// Operational pathways mapped to user-scoped controller execution matrix blocks
router.post('/checkout', protect, createInvoice); // Secured with token validation
router.get('/history', protect, getBillingHistory); // Secured with token validation

export default router;