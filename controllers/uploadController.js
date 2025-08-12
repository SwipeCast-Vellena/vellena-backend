import path from 'path';
import fs from 'fs';
import multer from 'multer';

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

export const upload = multer({ storage }).single('video');

// Controller
export const uploadVideo = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No video file uploaded' });
  }

  const videoUrl = `${req.protocol}://${req.get('host')}/uploads/videos/${req.file.filename}`;

  return res.json({
    videoUrl,
    msg: 'Video uploaded successfully',
  });
};
