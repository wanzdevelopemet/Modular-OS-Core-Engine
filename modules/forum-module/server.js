import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());

// Phục vụ các tệp tĩnh của Forum Module (HTML, JS, CSS)
app.use(express.static(path.join(__dirname, 'frontend')));

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`💬  Forum Module (HTML5 Iframe) đang chạy tại http://localhost:${PORT}`);
  console.log(`📡  Anti-Mesh Listener: Đang lắng nghe Event Bus`);
  console.log(`=======================================================`);
});

