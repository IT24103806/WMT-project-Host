const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDirectory = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const basename = path.basename(file.originalname, extension).replace(/\s+/g, "-").toLowerCase();
    cb(null, `${Date.now()}-${basename}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const allowedExt = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
  const isImageMime = String(file.mimetype || "").toLowerCase().startsWith("image/");
  const isAllowedExt = allowedExt.includes(ext);
  if (!isImageMime && !isAllowedExt) {
    return cb(new Error("Only image files (JPEG, JPG, PNG, WEBP, HEIC) are allowed"), false);
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter
});

module.exports = upload;
