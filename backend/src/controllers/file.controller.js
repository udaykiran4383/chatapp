import cloudinary from "../lib/cloudinary.js";

/**
 * Upload file to Cloudinary
 * POST /api/files/upload
 */
export const uploadFile = async (req, res) => {
  try {
    const { fileData, fileName, contentType } = req.body;

    if (!fileData) {
      return res.status(400).json({
        error: "fileData is required",
      });
    }

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(fileData, {
      resource_type: "auto", // Detects image/video/raw
      public_id: `chatapp_uploads/${Date.now()}_${fileName}`, // Optional: organized folder
    });

    res.status(200).json({
      url: uploadResponse.secure_url,
      name: fileName,
      size: uploadResponse.bytes,
      type: contentType,
      storage: "cloudinary",
    });
  } catch (error) {
    console.error("Error in uploadFile:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
};

/**
 * Generate presigned URL for file download
 * GET /api/files/download/:fileKey
 */
export const generateDownloadUrl = async (req, res) => {
  try {
    const { fileKey } = req.params;

    if (!fileKey) {
      return res.status(400).json({ error: "File key is required" });
    }

    const fileName = req.query.fileName;

    const downloadUrl = await s3Service.generatePresignedDownloadUrl(
      decodeURIComponent(fileKey),
      3600,
      fileName
    );

    res.status(200).json({
      downloadUrl,
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    console.error("Error in generateDownloadUrl:", error);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
};

/**
 * Get file upload statistics
 * GET /api/files/stats
 */
export const getFileStats = async (req, res) => {
  try {
    // This would typically query your database for file upload counts
    // For now, return a placeholder
    res.status(200).json({
      totalFiles: 0,
      message: "File statistics endpoint - integrate with your analytics",
    });
  } catch (error) {
    console.error("Error in getFileStats:", error);
    res.status(500).json({ error: "Failed to get file statistics" });
  }
};
