import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const uploadOnCloudinary = async (filePath) => {
  try {
    if (!filePath) return null;

    // 🔥 CONFIGURE CLOUDINARY AT RUNTIME (AFTER dotenv)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    // 🔍 HARD CHECK (temporary but useful)
    if (!process.env.CLOUDINARY_API_KEY) {
      console.error("❌ CLOUDINARY ENV NOT LOADED");
      return null;
    }

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "image",
    });

    // cleanup local file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return result;

  } catch (error) {
    console.error("❌ Cloudinary upload error:", error.message);

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return null;
  }
};

export { uploadOnCloudinary };
