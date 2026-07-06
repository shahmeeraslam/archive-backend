import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  // Relational link connecting each item strictly to its creator node
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Speeds up lookups when filtering items by user ID
  },
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  retailPrice: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  wholesalePrice: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 0, 
    default: 1 
  },
  category: { 
    type: String, 
    default: 'General', 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true 
  },
  image: { 
    type: String 
  } 
}, { timestamps: true });

const Item = mongoose.model('Item', itemSchema);
export default Item;