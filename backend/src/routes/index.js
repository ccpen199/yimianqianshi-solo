const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { getBatches, getBatch, createBatch, updateBatch, deleteBatch } = require('../controllers/batchController');
const { getAudioFiles, getAudioFile, uploadAudio, serveAudio, deleteAudio } = require('../controllers/audioController');
const { getSegments, getSegment, createSegments, updateSegment, autoSplit } = require('../controllers/segmentController');
const { getSpeakers, createSpeaker, updateSpeaker, deleteSpeaker } = require('../controllers/speakerController');
const { createQualityCheck, getQualityChecks, getQualityStats, exportData } = require('../controllers/qualityController');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /wav|mp3|ogg|m4a|flac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('仅支持音频文件'));
  },
  limits: { fileSize: 500 * 1024 * 1024 }
});

router.get('/health', (req, res) => {
  res.json({ success: true, message: '服务正常运行' });
});

router.get('/batches', getBatches);
router.get('/batches/:id', getBatch);
router.post('/batches', createBatch);
router.put('/batches/:id', updateBatch);
router.delete('/batches/:id', deleteBatch);

router.get('/audio-files', getAudioFiles);
router.get('/audio-files/:id', getAudioFile);
router.post('/audio-files/upload', upload.single('audio'), uploadAudio);
router.get('/audio-files/stream/:filename', serveAudio);
router.delete('/audio-files/:id', deleteAudio);

router.get('/segments', getSegments);
router.get('/segments/:id', getSegment);
router.post('/segments', createSegments);
router.put('/segments/:id', updateSegment);
router.post('/segments/auto-split', autoSplit);

router.get('/speakers', getSpeakers);
router.post('/speakers', createSpeaker);
router.put('/speakers/:id', updateSpeaker);
router.delete('/speakers/:id', deleteSpeaker);

router.get('/quality-checks', getQualityChecks);
router.post('/quality-checks', createQualityCheck);
router.get('/quality-stats', getQualityStats);

router.post('/export', exportData);

module.exports = router;