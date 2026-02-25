import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // ATUALIZADO: Usando o novo Router da Hugging Face conforme a mensagem de erro
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
      {
        headers: {
          Authorization: `Bearer ${process.env.VITE_HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      }
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HF Error: ${response.status} - ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.set('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (error) {
    console.error("Erro no Proxy:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`
  🚀 ApexAI Backend Proxy ATUALIZADO!
  📡 URL: http://localhost:${PORT}/api/generate-image
  `);
});