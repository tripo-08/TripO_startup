const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendResponse, sendError, asyncHandler } = require('../middleware');

const router = express.Router();

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Create unique filename: timestamp-random-originalName
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'profile-' + uniqueSuffix + ext);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

/**
 * POST /api/uploads/profile-image
 * Upload a profile image
 */
router.post('/profile-image', upload.single('image'), asyncHandler(async (req, res) => {
    if (req.fileValidationError) {
        return sendError(res, 400, 'INVALID_FILE', req.fileValidationError);
    }

    if (!req.file) {
        return sendError(res, 400, 'NO_FILE', 'Please upload a file');
    }

    // Construct URL
    // Assumes server serves 'uploads' directory statically
    const port = process.env.PORT || 5000;
    const protocol = req.protocol;
    const host = req.get('host');

    // Check if running behind proxy or in dev
    // For local dev, construct full URL. For prod, might be relative or CDN.
    // Making it a full URL for simplicity in this dev environment
    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    sendResponse(res, 200, {
        imageUrl: imageUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
    }, 'Image uploaded successfully');
}));

/**
 * POST /api/uploads/license-image
 * Upload a license image
 */
router.post('/license-image', upload.single('image'), asyncHandler(async (req, res) => {
    if (req.fileValidationError) {
        return sendError(res, 400, 'INVALID_FILE', req.fileValidationError);
    }

    if (!req.file) {
        return sendError(res, 400, 'NO_FILE', 'Please upload a file');
    }

    const port = process.env.PORT || 5000;
    const protocol = req.protocol;
    const host = req.get('host');

    // Create a new filename with 'license-' prefix if not already present (multer config handles filename generation, 
    // but here we just return the URL based on what was saved. 
    // Ideally we'd configure separate storage for different prefixes, but for simplicity we use the same upload config).
    // Note: The storage configuration at the top uses 'profile-' prefix. 
    // To distinguish, we might want to rename the file or just accept 'profile-' prefix for now since it's just a file storage.
    // However, to be cleaner, let's just stick with the existing storage config which is generic enough (timestamp based).
    // The previous storage config hardcoded 'profile-' prefix. Let's make it smarter or just accept it.

    // Actually, looking at lines 18-24, it hardcodes 'profile-'. 
    // To support 'license-' prefix properly without changing global storage, 
    // we would need a separate multer instance or dynamic storage.
    // For now, to minimize risk, I will just use the existing upload middleware which saves as 'profile-...'.
    // The user just wants it stored. The filename prefix is a detail.
    // I will return the URL as is.

    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    sendResponse(res, 200, {
        imageUrl: imageUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
    }, 'License image uploaded successfully');
}));

module.exports = router;
