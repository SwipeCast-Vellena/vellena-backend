const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads/videos');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage }).single('video');

// Configure Multer storage for PDFs
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads/pdf');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const pdfUpload = multer({ 
  storage: pdfStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
}).single('pdf');

// Controller
const uploadVideo = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No video file uploaded' });
  }

  const videoUrl = `${req.protocol}://${req.get('host')}/uploads/videos/${req.file.filename}`;

  return res.json({
    videoUrl,
    msg: 'Video uploaded successfully',
  });
};

// PDF upload controller
const uploadPdf = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No PDF file uploaded' });
  }

  const pdfPath = `/uploads/pdf/${req.file.filename}`;

  return res.json({
    pdfPath,
    msg: 'PDF uploaded successfully',
  });
};

module.exports = { upload, uploadVideo, pdfUpload, uploadPdf };
