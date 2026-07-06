import mongoose from 'mongoose';

const BillingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Matches the name of your authentication user schema
    required: true
  },
  invoiceNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  customerName: { 
    type: String, 
    default: 'Walk-in Retail Client' 
  },
  items: [{
    productId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Item' // Matches your item/inventory product registration model
    },
    name: { 
      type: String, 
      required: true 
    },
    quantity: { 
      type: Number, 
      required: true 
    },
    rateApplied: { 
      type: Number, 
      required: true 
    },
    pricingType: { 
      type: String, 
      enum: ['RTL', 'WHL'], 
      required: true 
    }
  }],
  totalAmount: { 
    type: Number, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model('Billing', BillingSchema);