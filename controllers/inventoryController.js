import Item from "../models/items.js";
import xlsx from "xlsx";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse"); // @desc    Fetch only the live inventory manifest ledger belonging to the active user
// @route   GET /api/inventory
export const getInventory = async (req, res) => {
  try {
    // CRITICAL: Filter documents strictly matching the authenticated user's ID
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
    const {
      name,
      retailPrice,
      wholesalePrice,
      quantity,
      category,
      description,
      image,
    } = req.body;

    const newItem = new Item({
      userId: req.user.id, // CRITICAL: Embed the owner's credential token pointer link
      name,
      retailPrice: parseFloat(retailPrice),
      wholesalePrice: parseFloat(wholesalePrice),
      quantity: parseInt(quantity, 10),
      category: category || "General",
      description,
      image,
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
    res
      .status(400)
      .json({ error: "Data normalization error. Verify numeric data rules." });
  }
};

// @desc    Target and securely remove a user's specific line item from memory
// @route   DELETE /api/inventory/:id
export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    // CRITICAL: Ensure the item matches both the requested ID AND belongs to the logged-in user
    const deletedItem = await Item.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!deletedItem) {
      return res
        .status(404)
        .json({
          error:
            "Product entry identifier index pointer matching not found or unauthorized access.",
        });
    }

    res.json({
      success: true,
      message: "Stock line clean erasure successful.",
    });
  } catch (error) {
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
    const updates = req.body;

    // Target the specific document ensuring it belongs strictly to the active user
    const updatedItem = await Item.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }, // Return the fresh updated doc and run schema rules
    );

    if (!updatedItem) {
      return res
        .status(404)
        .json({
          error:
            "Product entry identifier index pointer matching not found or unauthorized.",
        });
    }

    // Format the updated document to match your frontend data expectations
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

    // 📊 STRICT EXCEL / CSV VERIFICATION & INGESTION PIPELINE
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
        // 1. Lowercase keys and strip all spaces/underscores for flawless cross-platform header mapping
        const cleanRow = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = key.toLowerCase().replace(/[\s_]/g, '');
          cleanRow[normalizedKey] = row[key];
        });

        // 2. Extract values based on flexible variation headers
        const name = cleanRow.name || cleanRow.productname || cleanRow.item;
        
        // Mongoose requires true Numbers or parsable floats/ints
        const retailPrice = parseFloat(cleanRow.retailprice || cleanRow.price || cleanRow.retail);
        const wholesalePrice = parseFloat(cleanRow.wholesaleprice || cleanRow.wholesale || cleanRow.cost);
        const quantity = parseInt(cleanRow.quantity || cleanRow.qty || cleanRow.stock, 10);
        
        // Optional structural values (will default to schema conditions if missing)
        const category = cleanRow.category || cleanRow.type || 'General';
        const description = cleanRow.description || cleanRow.details || '';
        const image = cleanRow.image || cleanRow.img || '';

        // 3. Schema Enforcement Verification Check
        if (!name || isNaN(retailPrice) || isNaN(wholesalePrice) || isNaN(quantity)) {
          throw new Error(`Row ${index + 2} has missing or malformed required metrics. Make sure Name, Retail Price, Wholesale Price, and Quantity are valid numbers.`);
        }

        // 4. Return formatted objects matching your itemSchema fields exactly
        return {
          userId: req.user.id, // Linked securely to your authenticated session model wrapper
          name: name.trim(),
          retailPrice: Math.max(0, retailPrice), // Prevents negative numbers violating min: 0
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

    // High-speed transaction ingestion directly down to MongoDB indexes
    const insertedDocs = await Item.insertMany(parsedItems);

    return res.json({ 
      success: true, 
      message: `Successfully imported ${insertedDocs.length} manifest records down to inventory indexes.`,
      data: insertedDocs 
    });

  } catch (error) {
    console.error('Import pipeline processing failure:', error);
    // Explicitly captures our custom layout row validation errors and handles them gracefully 
    return res.status(400).json({ success: false, error: error.message });
  }
};