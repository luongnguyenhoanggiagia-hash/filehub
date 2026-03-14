const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ntd942010';

// Upload & metadata directories — persistent on VPS/Render/Railway
const DATA_DIR = process.env.DATA_DIR || __dirname;
const uploadDir = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max per file
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── ROUTES ──────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ─── FILE METADATA ───────────────────────────────
const metaFile = path.join(DATA_DIR, 'files.json');
let files = [];
if (fs.existsSync(metaFile)) {
  try { files = JSON.parse(fs.readFileSync(metaFile, 'utf8')); } catch(e) { files = []; }
}
function saveMeta() {
  fs.writeFileSync(metaFile, JSON.stringify(files, null, 2));
}

// ─── PUBLIC API ──────────────────────────────────

// List files
app.get('/api/files', (req, res) => {
  res.json(files.map(f => ({
    id: f.id,
    name: f.originalName,
    size: f.size,
    uploadedAt: f.uploadedAt,
    description: f.description,
    category: f.category,
    downloads: f.downloads
  })));
});

// Download file
app.get('/api/download/:id', (req, res) => {
  const file = files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: 'File không tìm thấy' });
  const filePath = path.join(uploadDir, file.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File đã bị xoá khỏi server' });
  file.downloads = (file.downloads || 0) + 1;
  saveMeta();
  res.download(filePath, file.originalName);
});

// ─── ADMIN API ───────────────────────────────────

// Login
app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) res.json({ success: true });
  else res.status(401).json({ error: 'Sai mật khẩu' });
});

// Upload
app.post('/api/admin/upload', upload.single('file'), (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Sai mật khẩu admin' });
  if (!req.file) return res.status(400).json({ error: 'Không có file' });
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    originalName: req.file.originalname,
    filename: req.file.filename,
    size: req.file.size,
    description: req.body.description || '',
    category: req.body.category || 'Khác',
    uploadedAt: new Date().toISOString(),
    downloads: 0
  };
  files.unshift(entry);
  saveMeta();
  res.json({ success: true, file: entry });
});

// Delete
app.delete('/api/admin/files/:id', (req, res) => {
  if (req.query.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Sai mật khẩu admin' });
  const idx = files.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy' });
  const [removed] = files.splice(idx, 1);
  const fp = path.join(uploadDir, removed.filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  saveMeta();
  res.json({ success: true });
});

// Update info
app.put('/api/admin/files/:id', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Sai mật khẩu admin' });
  const file = files.find(f => f.id === req.params.id);
  if (!file) return res.status(404).json({ error: 'Không tìm thấy' });
  if (req.body.description !== undefined) file.description = req.body.description;
  if (req.body.category !== undefined) file.category = req.body.category;
  saveMeta();
  res.json({ success: true });
});

// ─── START ───────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀  FILE HUB đang chạy`);
  console.log(`    http://0.0.0.0:${PORT}/`);
  console.log(`    http://0.0.0.0:${PORT}/admin`);
  console.log(`    Mật khẩu: ${ADMIN_PASSWORD}\n`);
});

module.exports = app;
