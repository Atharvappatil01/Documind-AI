from fastapi import FastAPI, File, UploadFile, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import shutil
import os
import json
from .ai_service import ai_service

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/ingest")
async def ingest_pdf(files: list[UploadFile] = File(...)):
    try:
        # Create a directory for uploads if it doesn't exist
        uploads_dir = "uploads"
        os.makedirs(uploads_dir, exist_ok=True)
        
        saved_files = []
        for file in files:
            file_path = os.path.join(uploads_dir, file.filename)
            
            print(f"Saving file to: {file_path}")
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            saved_files.append(file.filename)
            print(f"File {file.filename} saved successfully.")
        
        # Process PDFs with AI service
        file_paths = [os.path.join(uploads_dir, filename) for filename in saved_files]
        print(f"Processing files: {file_paths}")
        
        try:
            success = ai_service.add_documents(file_paths)
            print(f"AI service processing result: {success}")
            
            if success:
                return {"filenames": saved_files, "message": f"{len(saved_files)} file(s) ingested and processed successfully."}
            else:
                return {"filenames": saved_files, "message": f"{len(saved_files)} file(s) saved but processing failed."}
        except Exception as e:
            print(f"Error in AI service processing: {e}")
            return {"filenames": saved_files, "message": f"{len(saved_files)} file(s) saved but processing failed: {str(e)}"}
    except Exception as e:
        print(f"An error occurred: {e}")
        return {"error": str(e)}

class AskRequest(BaseModel):
    question: str
    top_k: int = 5
    selected_documents: list[str] = None

@app.post("/ask")
async def ask_question(request: AskRequest):
    try:
        # Use AI service to get answer
        result = ai_service.ask_question(request.question, request.top_k, request.selected_documents)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Welcome to the Legal Researcher AI backend!"}

@app.get("/health")
async def health_check():
    print("Health check requested")
    response = {"status": "up"}
    print(f"Health check response: {response}")
    return response

@app.get("/documents")
async def get_documents():
    """Get list of uploaded documents"""
    try:
        documents = ai_service.get_documents()
        return {"documents": documents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{filename}")
async def delete_document(filename: str = Path(...)):
    try:
        # Remove file from uploads
        uploads_dir = "uploads"
        file_path = os.path.join(uploads_dir, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        # Remove from ai_service.documents
        ai_service.documents = [doc for doc in ai_service.documents if doc["filename"] != filename]
        ai_service.save_documents()
        # Remove from vector store (if possible)
        if ai_service.vector_store:
            try:
                ai_service.vector_store._collection.delete(where={"source": filename})
            except Exception as e:
                print(f"Warning: Could not remove from vector store: {e}")
        return {"success": True, "message": f"Document {filename} deleted."}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/debug-retrieval")
async def debug_retrieval(question: str, top_k: int = 5):
    """Debug endpoint to see what documents are being retrieved for a question"""
    try:
        debug_info = ai_service.debug_retrieval(question, top_k)
        return debug_info
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)