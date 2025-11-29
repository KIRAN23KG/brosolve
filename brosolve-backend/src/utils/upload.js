const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const AUDIO_DIR = path.join(__dirname, '..', '..', 'uploads', 'audio');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + file.originalname.replace(/\s+/g,'_');
    cb(null, unique);
  }
});

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AUDIO_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + file.originalname.replace(/\s+/g,'_');
    cb(null, unique);
  }
});

// File filter for audio uploads
const audioFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'audio/webm',
    'audio/wav',
    'audio/mpeg',
    'audio/ogg',
    'audio/mp3',
    'audio/mp4',
    'audio/x-m4a'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid audio file type. Allowed types: webm, wav, mpeg, ogg, mp3, mp4, m4a'), false);
  }
};

const upload = multer({ storage });
const audioUpload = multer({ 
  storage: audioStorage,
  fileFilter: audioFileFilter
});

module.exports = { upload, audioUpload };
