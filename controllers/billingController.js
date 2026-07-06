import Billing from '../models/Billing.js';
import Item from '../models/items.js'; // Points directly to your items storage schema

// @desc    Create new bill and update warehouse stock counts (User-Scoped)
// @route   POST /api/billing/checkout
export const createInvoice = async (req, res) => {
  try {
    const { invoiceNumber, customerName, cartItems, totalAmount } = req.body;

    // Validation guard clause
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Checkout transaction aborted: Cart matrix layout is empty." 
      });
    }

    // 1. Instantiate the invoice record mapped to the authenticated user's ID
    const newInvoice = new Billing({
      user: req.user?._id || req.user?.id, // <-- Ties the bill to the specific operating user account
      invoiceNumber,
      customerName: customerName && customerName.trim() ? customerName.trim() : 'Walk-in Retail Client',
      items: cartItems.map(item => ({
        productId: item._id || item.id,
        name: item.name,
        quantity: item.quantity,
        rateApplied: item.quantity >= 10 ? parseFloat(item.wholesalePrice) : parseFloat(item.retailPrice),
        pricingType: item.quantity >= 10 ? 'WHL' : 'RTL'
      })),
      totalAmount: parseFloat(totalAmount)
    });

    await newInvoice.save();

    // 2. Bulk update array mutations to decrease stock volumes across items safely
    const bulkStockOperations = cartItems.map(item => ({
      updateOne: {
        filter: { _id: item._id || item.id },
        update: { $inc: { quantity: -item.quantity } } // Atomic deduction matrix
      }
    }));

    await Item.bulkWrite(bulkStockOperations);

    return res.status(201).json({ 
      success: true, 
      data: newInvoice 
    });

  } catch (err) {
    console.error("Billing execution engine fault:", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message || "Internal server ledger mutation fault." 
    });
  }
};

// @desc    Retrieve registered billing invoices created by the logged-in user
// @route   GET /api/billing/history
export const getBillingHistory = async (req, res) => {
  try {
    // Queries database to strictly pull invoices belonging to the active user session
    const userId = req.user?._id || req.user?.id;
    const history = await Billing.find({ user: userId }).sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (err) {
    console.error("History engine retrieval fault:", err);
    return res.status(500).json({ 
      success: false, 
      error: "Failed to read data from database matrix." 
    });
  }
};