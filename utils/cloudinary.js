import 'dotenv/config'; // 🔥 Forces immediate local env file resolution on this thread
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// 1. Configure Cloudinary Environment Parameters
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ... rest of your multer and stream code stays exactly the same
// 2. Set up Multer to intercept files cleanly into RAM Memory Buffers
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  limits: { fileSize: 3 * 1024 * 1024 } // Optional: Enforce 3MB limit to keep accounts safe
});

// 3. Helper Function: Ingest Raw RAM Buffers and Pipe them up to Cloudinary
export const uploadToCloudinary = (fileBuffer, folderName = "inventory_products") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: "auto",
        transformation: [{ width: 500, height: 500, crop: "limit", quality: "auto" }] // 🔥 Free Tier Hack: Auto-compresses and resizes to save bucket storage space!
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url); // This returns the clean secure https:// web address string
      }
    );
    stream.end(fileBuffer);
  });
};
export const deleteFromCloudinary = async (imageUrl) => {
  if (!imageUrl) return null;

  try {
    // Cloudinary URLs look like: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/filename.jpg
    // We split by '/upload/' to isolate everything following the version parameters
    const urlParts = imageUrl.split('/upload/');
    if (urlParts.length < 2) return null;

    // Remove the version segment (e.g., 'v16235678/') and strip off the file extension
    const pathAfterUpload = urlParts[1].replace(/^v\d+\//, ''); 
    const publicId = pathAfterUpload.split('.').slice(0, -1).join('.');

    if (publicId) {
      // Execute destruction stream over secure pipeline
      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`Cloudinary storage node execution sequence: Deleted public_id -> ${publicId}`, result);
      return result;
    }
  } catch (error) {
    console.error("Cloudinary asset deletion failure cascade:", error);
    throw error;
  }
};