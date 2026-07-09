import Item from "../models/items.js";
import xlsx from "xlsx";
import pdfParse from "pdf-parse-fork"; 
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"; // 🔥 Hooked in deletion helper

// @desc    Fetch only the live inventory manifest ledger belonging to the active user
// @route   GET /api/inventory
export const getInventory = async (req, res) => {
  try {
    const items = await Item.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });

    const formattedItems = items.map((item) => ({
      id: item._id,
      name: item.name,
      retailPrice: item.retailPrice,
      wholesalePrice: item.wholesalePrice,
      quantity: item.quantity,
      category: item.category,
      description: item.description,
      image: item.image,
    }));
    res.json(formattedItems);
  } catch (error) {
    res
      .status(500)
      .json({ error: "System failed to parse inventory matrix records." });
  }
};

// @desc    Validate and write a brand new stock entry linked to the active user
// @route   POST /api/inventory
export const createItem = async (req, res) => {
  try {
    let imageUrl = "";

    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer);
    } else if (req.body.image) {
      imageUrl = req.body.image; 
    }

    const {
      name,
      retailPrice,
      wholesalePrice,
      quantity,
      category,
      description,
    } = req.body;

    const newItem = new Item({
      userId: req.user.id, 
      name,
      retailPrice: parseFloat(retailPrice),
      wholesalePrice: parseFloat(wholesalePrice),
      quantity: parseInt(quantity, 10),
      category: category || "General",
      description,
      image: imageUrl, 
    });

    const savedItem = await newItem.save(); 
    res.status(201).json({
      id: savedItem._id,
      name: savedItem.name,
      retailPrice: savedItem.retailPrice,
      wholesalePrice: savedItem.wholesalePrice,
      quantity: savedItem.quantity,
      category: savedItem.category,
      description: savedItem.description,
      image: savedItem.image,
    });
  } catch (error) {
    console.error("Creation endpoint pipeline exception:", error);
    res
      .status(400)
      .json({ error: "Data normalization error. Verify numeric data rules." });
  }
};

// @desc    Target and securely remove a user's specific line item from memory and Cloudinary
// @route   DELETE /api/inventory/:id
export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Locate entry parameters first to check for an existing image path
    const targetItem = await Item.findOne({ _id: id, userId: req.user.id });

    if (!targetItem) {
      return res.status(404).json({
        error: "Product entry identifier index pointer matching not found or unauthorized access.",
      });
    }

    // 2. 🔥 Cloud Storage Cleanup: If it has a valid Cloudinary secure asset URL, purge it
    if (targetItem.image && targetItem.image.includes('res.cloudinary.com')) {
      await deleteFromCloudinary(targetItem.image);
    }

    // 3. Remove document record from your local cluster database index completely
    await Item.deleteOne({ _id: id, userId: req.user.id });

    res.json({
      success: true,
      message: "Stock line and linked cloud assets clean erasure successful.",
    });
  } catch (error) {
    console.error("Deletion endpoint exception cascade:", error);
    res
      .status(500)
      .json({ error: "Internal pipeline error executing line wipe." });
  }
};

// @desc    Modify records of an existing item matching user context bounds
// @route   PUT /api/inventory/:id
export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };

    // 1. Locate the item to evaluate if an active image update sequence is running
    const existingItem = await Item.findOne({ _id: id, userId: req.user.id });
    if (!existingItem) {
      return res.status(404).json({
        error: "Product entry identifier index pointer matching not found or unauthorized.",
      });
    }

    // 2. 🔥 Active Replacement Guard: Drop the old image before saving the new stream buffer
    if (req.file) {
      if (existingItem.image && existingItem.image.includes('res.cloudinary.com')) {
        await deleteFromCloudinary(existingItem.image);
      }
      const newImageUrl = await uploadToCloudinary(req.file.buffer);
      updates.image = newImageUrl;
    }

    // 3. Persist modifications down to MongoDB Atlas
    const updatedItem = await Item.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }, 
    );

    res.json({
      id: updatedItem._id,
      name: updatedItem.name,
      retailPrice: updatedItem.retailPrice,
      wholesalePrice: updatedItem.wholesalePrice,
      quantity: updatedItem.quantity,
      category: updatedItem.category,
      description: updatedItem.description,
      image: updatedItem.image,
    });
  } catch (error) {
    console.error("Update endpoint pipeline exception:", error);
    res
      .status(400)
      .json({
        error: "Failed to update ledger records. Verify data constraints.",
      });
  }
};

// ==========================================
// @desc    Parse uploaded Excel/PDF manifests and execute bulk writes
// @route   POST /api/inventory/import
// ==========================================
export const importInventory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file document uploaded.' });
    }

    let parsedItems = [];
    const mimeType = req.file.mimetype;
    const originalName = req.file.originalname.toLowerCase();

    if (
      mimeType.includes('spreadsheetml') || 
      mimeType.includes('excel') || 
      mimeType.includes('csv') || 
      originalName.endsWith('.csv') || 
      originalName.endsWith('.xlsx') || 
      originalName.endsWith('.xls')
    ) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

      parsedItems = rawData.map((row, index) => {
        const cleanRow = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = key.toLowerCase().replace(/[\s_]/g, '');
          cleanRow[normalizedKey] = row[key];
        });

        const name = cleanRow.name || cleanRow.productname || cleanRow.item;
        const retailPrice = parseFloat(cleanRow.retailprice || cleanRow.price || cleanRow.retail);
        const wholesalePrice = parseFloat(cleanRow.wholesaleprice || cleanRow.wholesale || cleanRow.cost);
        const quantity = parseInt(cleanRow.quantity || cleanRow.qty || cleanRow.stock, 10);
        
        const category = cleanRow.category || cleanRow.type || 'General';
        const description = cleanRow.description || cleanRow.details || '';
        const image = cleanRow.image || cleanRow.img || '';

        if (!name || isNaN(retailPrice) || isNaN(wholesalePrice) || isNaN(quantity)) {
          throw new Error(`Row ${index + 2} has missing or malformed required metrics. Make sure Name, Retail Price, Wholesale Price, and Quantity are valid numbers.`);
        }

        return {
          userId: req.user.id, 
          name: name.trim(),
          retailPrice: Math.max(0, retailPrice), 
          wholesalePrice: Math.max(0, wholesalePrice),
          quantity: Math.max(0, quantity),
          category: category.trim(),
          description: description.trim(),
          image: image.trim()
        };
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Unsupported file format architecture. Please upload a standard Excel sheet (.xlsx, .xls) or a clean .csv file.' 
      });
    }

    if (parsedItems.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'The uploaded file does not contain any readable row records.' 
      });
    }

    const insertedDocs = await Item.insertMany(parsedItems);

    return res.json({ 
      success: true, 
      message: `Successfully imported ${insertedDocs.length} manifest records down to inventory indexes.`,
      data: insertedDocs 
    });

  } catch (error) {
    console.error('Import pipeline processing failure:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
};