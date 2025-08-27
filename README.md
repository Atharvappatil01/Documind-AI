# 🧠 DocuMind AI

![DocuMind AI Logo](./documind_ai_logo.svg)

**DocuMind AI** is an intelligent assistant for **document drafting, summarization, clause extraction, and citation lookup**.  
It is designed as a **developer-friendly, research-ready project** to showcase how AI can support document workflows.  
⚖️ *Important: DocuMind AI is not a lawyer and does not provide legal advice.*

---

## ✨ Features

- 📄 **Document Analysis**: Summarize large documents into concise insights.  
- 🔎 **Clause Extraction**: Identify key clauses, obligations, and definitions.  
- ✍️ **AI-Powered Drafting**: Generate draft clauses, agreements, or letters.  
- 🧩 **Prompt Templates**: Reusable and customizable for common document types.  
- 🔗 **Optional RAG Mode**: Connect to vector databases (Pinecone, FAISS, Weaviate, etc.) for retrieval-augmented generation.  
- 🌐 **Web App Ready**: Frontend + backend separation, works in browser or API mode.  

---

## 🏗️ Project Structure

```
documind-ai/
  backend/                  # FastAPI/Flask/Node server for API requests
  frontend/                 # React or Next.js frontend app
  prompts/                  # Example prompt templates
  data/                     # Sample input documents (small-sized)
  README.md
  .env.example
  package.json
```

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/documind-ai.git
cd documind-ai
```

### 2. Environment Setup
Install dependencies:

**Frontend (React/Next.js):**
```bash
npm install
```

**Backend (Python):**
```bash
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment
Create a `.env` file (or use `.env.example`) and add your keys:
```env
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
EMBEDDINGS_MODEL=text-embedding-3-large
API_BASE_URL=http://localhost:5000
```

### 4. Run
Frontend:
```bash
npm start
```

Backend:
```bash
python app.py
# or if FastAPI: uvicorn main:app --reload
```

---

## 🚀 Usage Examples

### Document Summarization
Upload a `.txt` or paste text → get a structured summary with highlights.

### Clause Extraction
Paste a contract → see extracted obligations, liabilities, and definitions.

### Draft Generation
Provide context → generate draft NDA, employment clause, or business letter.

---

## 📊 Roadmap

- [ ] Add PDF parsing with OCR  
- [ ] Support multilingual documents  
- [ ] Integrate citation lookup with case law datasets  
- [ ] Deploy demo on Hugging Face Spaces  

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or PR with suggestions.  

---

## 🔐 Disclaimer

- **DocuMind AI is not a substitute for professional legal services.**  
- All outputs should be reviewed by a qualified human expert.  

---

## 📝 License

This project is licensed under the **MIT License**.  
