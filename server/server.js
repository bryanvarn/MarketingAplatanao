require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const assistantsRoutes = require('./routes/assistants');
const aiRoutes = require('./routes/ai');
const pdfRoutes = require('./routes/pdf');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/assistants', assistantsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/pdf', pdfRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    notionConfigured: !!(process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID),
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    adminConfigured: !!process.env.ADMIN_PASSWORD,
  });
});

const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Marketing Aplatanao backend escuchando en el puerto', PORT));
