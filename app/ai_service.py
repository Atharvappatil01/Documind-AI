import os
import json
from datetime import datetime
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain.schema import Document
from typing import List, Dict, Any, Optional
import chromadb
from dotenv import load_dotenv
from os.path import basename
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQAWithSourcesChain
import re
load_dotenv()

GROUNDING_PROMPT = PromptTemplate.from_template("""
You are an expert legal research assistant specializing in residential lease agreements. Your task is to provide comprehensive, well-structured answers based solely on the provided document excerpts.

## RESPONSE FORMAT REQUIREMENTS:

1. **STRUCTURE YOUR ANSWER** with clear sections using headers:
   - SUMMARY (2-3 sentences overview focusing on key lease terms)
   - KEY FINDINGS (bullet points of main lease provisions)
   - DETAILED ANALYSIS (comprehensive explanation of lease terms)
   - RELEVANT PROVISIONS (specific clauses/sections with exact text)
   - IMPLICATIONS (practical impact for tenant/landlord)

2. **CITATION FORMAT**: Every factual statement must end with (Source: [filename]:[page])
   - Use exact page numbers when available
   - If page number is missing, use (Source: [filename])
   - Never leave incomplete citations
   - Use consistent citation format throughout

3. **LEASE-SPECIFIC GUIDELINES**:
   - Always identify: lease term dates, rent amount, payment schedule, security deposit
   - Highlight: tenant obligations, landlord obligations, property details
   - Note: utilities, parking, maintenance, termination conditions
   - Include: property address, tenant/landlord names if available

4. **FORMATTING GUIDELINES**:
   - Use **bold** for emphasis on key terms and section headers
   - Use bullet points (*) consistently for all lists
   - Use numbered lists for sequential items
   - Use blockquotes (>) for direct quotes from the lease
   - Add proper line breaks between sections
   - Use consistent spacing throughout

5. **MARKDOWN FORMATTING**:
   - Start each section with ## HEADER
   - Add blank lines between sections
   - Use consistent bullet point style (*)
   - Ensure proper spacing around citations

## RESPONSE QUALITY REQUIREMENTS:

- Be thorough but concise
- Prioritize accuracy over brevity
- Use precise legal terminology
- Provide practical implications
- Cross-reference related provisions when relevant
- Note any ambiguities or areas requiring clarification

## IF INFORMATION IS INSUFFICIENT:
If key lease information (rent, dates, property details) is missing, clearly state what information is available and what is missing. Do not make assumptions about missing information.

## QUESTION:
{question}

## DOCUMENT EXCERPTS:
{context}

Now provide a comprehensive, well-structured lease analysis following the format requirements above. Ensure proper markdown formatting with clear section separation and consistent citation style.
""")

class LegalAIService:
    def __init__(self):
        # Configure Gemini API
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required")
        
        genai.configure(api_key=api_key)
        
        # Initialize LLM with improved configuration for better responses
        self.llm = ChatGoogleGenerativeAI(
            model="models/gemini-1.5-pro-latest",
            temperature=0.3,  # Lower temperature for more consistent, factual responses
            max_output_tokens=4096,  # Increased for more comprehensive responses
            google_api_key=os.environ.get("GOOGLE_API_KEY"),
            top_p=0.9,  # Better response diversity while maintaining quality
            top_k=40,  # Improved token selection
        )
        
        # Initialize embeddings
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        
        # Initialize vector store
        chroma_dir = './chroma_db'
        if os.path.exists(chroma_dir) and os.listdir(chroma_dir):
            try:
                self.vector_store = Chroma(
                    embedding_function=self.embeddings,
                    persist_directory=chroma_dir
                )
                print('Loaded existing Chroma vector store from disk.')
            except Exception as e:
                print(f'Error loading Chroma vector store: {e}')
                self.vector_store = None
        else:
            self.vector_store = None
        # Improved text splitting for better context preservation
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,   # Larger chunks for better context
            chunk_overlap=200,  # More overlap to maintain context continuity
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""]  # Better sentence boundary detection
        )
        
        # Document tracking
        self.documents_file = "documents.json"
        self.load_documents()
    
    def load_documents(self):
        """Load the list of uploaded documents"""
        try:
            if os.path.exists(self.documents_file):
                with open(self.documents_file, 'r') as f:
                    self.documents = json.load(f)
            else:
                self.documents = []
        except Exception as e:
            print(f"Error loading documents: {e}")
            self.documents = []
    
    def save_documents(self):
        """Save the list of uploaded documents"""
        try:
            with open(self.documents_file, 'w') as f:
                json.dump(self.documents, f, indent=2)
        except Exception as e:
            print(f"Error saving documents: {e}")
    
    def get_documents(self) -> List[Dict[str, Any]]:
        """Get list of uploaded documents"""
        return self.documents
    
    def process_pdf(self, file_path: str) -> List[Document]:
        """Process a PDF file and return chunks"""
        try:
            loader = PyPDFLoader(file_path)
            pages = loader.load()
            
            # Split into chunks
            chunks = self.text_splitter.split_documents(pages)
            
            # Add metadata
            for chunk in chunks:
                chunk.metadata["source"] = os.path.basename(file_path)
            
            return chunks
        except Exception as e:
            print(f"Error processing PDF {file_path}: {e}")
            return []
    
    def add_documents(self, file_paths: List[str]) -> bool:
        """Add documents to the vector store"""
        try:
            print(f"Starting to process {len(file_paths)} documents")
            all_chunks = []
            for path in file_paths:
                loader = PyPDFLoader(path)
                pages = loader.load()  # each page is a Document with metadata {'source': path, 'page': i}
                for page_doc in pages:
                    for chunk in self.text_splitter.split_documents([page_doc]):
                        # ensure consistent keys for filtering/citation
                        chunk.metadata["source"] = basename(path)
                        if "page" not in chunk.metadata and "page" in page_doc.metadata:
                            chunk.metadata["page"] = page_doc.metadata["page"]
                        all_chunks.append(chunk)
            
            print(f"Total chunks: {len(all_chunks)}")
            if not all_chunks:
                print("No chunks generated, returning False")
                return False
            
            # Create or update vector store
            if self.vector_store is None:
                print("Creating new vector store")
                self.vector_store = Chroma.from_documents(
                    documents=all_chunks,
                    embedding=self.embeddings,
                    persist_directory="./chroma_db"
                )
            else:
                print("Adding documents to existing vector store")
                self.vector_store.add_documents(all_chunks)
            
            # Note: New langchain-chroma automatically persists, no need to call persist()
            print("Documents added successfully")
            
            # Update document tracking
            for file_path in file_paths:
                filename = os.path.basename(file_path)
                if not any(doc["filename"] == filename for doc in self.documents):
                    self.documents.append({
                        "filename": filename,
                        "upload_time": str(datetime.now()),
                        "chunks": len([c for c in all_chunks if c.metadata.get("source") == filename])
                    })
            
            self.save_documents()
            print("Successfully added documents to vector store")
            return True
        except Exception as e:
            print(f"Error adding documents: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _preprocess_question(self, question: str) -> str:
        """Preprocess question to improve retrieval by extracting key terms and expanding synonyms."""
        # Common lease-related terms and their synonyms
        lease_terms = {
            'lease': ['rental agreement', 'rental contract', 'tenancy agreement', 'lease agreement'],
            'rent': ['monthly rent', 'rental payment', 'monthly payment', 'rent amount'],
            'term': ['lease term', 'duration', 'start date', 'end date', 'lease period'],
            'tenant': ['renter', 'lessee', 'occupant'],
            'landlord': ['lessor', 'property owner', 'owner'],
            'property': ['premises', 'unit', 'apartment', 'house', 'residence'],
            'payment': ['rent payment', 'monthly payment', 'installment payment'],
            'dates': ['start date', 'end date', 'lease start', 'lease end', 'move in', 'move out']
        }
        
        # Extract key terms from the question
        question_lower = question.lower()
        expanded_terms = []
        
        for term, synonyms in lease_terms.items():
            if term in question_lower:
                expanded_terms.extend(synonyms)
        
        # Add original question terms
        expanded_terms.extend(question.split())
        
        # Create enhanced query
        enhanced_query = question
        if expanded_terms:
            enhanced_query = f"{question} {' '.join(set(expanded_terms))}"
        
        return enhanced_query

    def ask_question(self, question: str, top_k: int = 10, selected_documents: Optional[List[str]] = None) -> Dict[str, Any]:
        """Ask a question and get a grounded answer with structured citations."""
        try:
            if self.vector_store is None:
                return {
                    "answer": "No documents have been uploaded yet. Please upload some legal documents first.",
                    "citations": [],
                    "confidence": "low",
                    "context_tokens": 0
                }
            
            # Preprocess question to improve retrieval
            enhanced_question = self._preprocess_question(question)
            
            # Enhanced retrieval with better parameters
            retriever = self._build_retriever(top_k=top_k, selected_documents=selected_documents)
            if retriever is None:
                return {
                    "answer": "Vector store unavailable. Re-ingest documents.",
                    "citations": [],
                    "confidence": "low",
                    "context_tokens": 0
                }
            
            # Get relevant documents first
            source_docs = retriever.get_relevant_documents(enhanced_question)
            
            if not source_docs:
                return {
                    "answer": "No relevant documents found for your question. Please try rephrasing or upload more documents.",
                    "citations": [],
                    "confidence": "low",
                    "context_tokens": 0
                }
            
            # Sort documents by relevance and prioritize pages with key information
            source_docs = self._prioritize_documents(source_docs, question)
            
            # Combine context from all relevant documents
            context = "\n\n".join([f"Document: {doc.metadata.get('source', 'Unknown')} (Page: {doc.metadata.get('page', 'Unknown')})\n{doc.page_content}" for doc in source_docs])
            
            # Generate dynamic prompt based on question analysis
            analysis = self._analyze_question(question)
            
            # Use different prompt templates based on question type
            if analysis["response_style"] == "concise":
                prompt = self._generate_concise_prompt(question, context, analysis)
            else:
                prompt = GROUNDING_PROMPT.format(question=question, context=context)
            
            # Get response from LLM
            response = self.llm.invoke(prompt)
            answer = response.content.strip()
            
            # Enhanced citation processing
            citations = []
            for d in source_docs:
                meta = getattr(d, "metadata", {}) or {}
                fname = meta.get("source") or meta.get("file_path") or "unknown"
                page = meta.get("page")
                if page is None and isinstance(meta.get("pages"), list) and meta["pages"]:
                    page = meta["pages"][0]
                citations.append({"source": fname, "page": page})
            
            # Enhanced answer post-processing
            answer = self._post_process_answer(answer, citations)
            
            # Apply length constraints if specified
            analysis = self._analyze_question(question)
            if analysis["word_limit"] or analysis["char_limit"]:
                answer = self._apply_length_constraints(answer, analysis)
            
            # Calculate confidence based on multiple factors
            confidence = self._calculate_confidence(citations, source_docs, answer)
            
            # Enhanced token counting
            token_count = sum(len((d.page_content or "").split()) for d in source_docs)
            
            # Enhanced source documents processing
            source_documents = [
                {
                    "source": (getattr(doc, "metadata", {}) or {}).get("source"),
                    "page": (getattr(doc, "metadata", {}) or {}).get("page"),
                    "excerpt": (doc.page_content or "")[:1000]  # Increased excerpt length
                }
                for doc in source_docs
            ]
            
            return {
                "answer": answer,
                "citations": citations,
                "confidence": confidence,
                "context_tokens": token_count,
                "source_documents": source_documents,
                "analysis_quality": self._assess_analysis_quality(answer, citations)
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                "answer": f"Error processing your question: {e}",
                "citations": [],
                "confidence": "low",
                "context_tokens": 0
            }

    def debug_retrieval(self, question: str, top_k: int = 5) -> Dict[str, Any]:
        """Debug method to see what documents are being retrieved for a question."""
        try:
            if self.vector_store is None:
                return {"error": "No vector store available"}
            
            retriever = self._build_retriever(top_k=top_k)
            if retriever is None:
                return {"error": "Could not build retriever"}
            
            source_docs = retriever.get_relevant_documents(question)
            
            debug_info = {
                "question": question,
                "total_documents_found": len(source_docs),
                "documents": []
            }
            
            for i, doc in enumerate(source_docs):
                meta = getattr(doc, "metadata", {}) or {}
                debug_info["documents"].append({
                    "rank": i + 1,
                    "source": meta.get("source", "unknown"),
                    "page": meta.get("page", "unknown"),
                    "content_preview": (doc.page_content or "")[:200] + "...",
                    "content_length": len(doc.page_content or "")
                })
            
            return debug_info
        except Exception as e:
            return {"error": str(e)}

    def _prioritize_documents(self, source_docs: List, question: str) -> List:
        """Prioritize documents based on relevance and presence of key information."""
        if not source_docs:
            return source_docs
        
        # Key terms that indicate important lease information
        key_terms = [
            'rent', 'monthly payment', 'installment payment', 'total rent',
            'start date', 'end date', 'lease term', 'duration',
            'tenant', 'landlord', 'property address', 'premises',
            'security deposit', 'utilities', 'parking'
        ]
        
        question_lower = question.lower()
        
        def score_document(doc):
            content = doc.page_content.lower()
            score = 0
            
            # Score based on question relevance
            for term in question_lower.split():
                if term in content:
                    score += 2
            
            # Score based on key lease information
            for term in key_terms:
                if term in content:
                    score += 3
            
            # Prioritize early pages (usually contain key terms)
            page = doc.metadata.get('page', 0)
            if isinstance(page, int) and page <= 5:
                score += 2
            
            return score
        
        # Sort documents by score (highest first)
        sorted_docs = sorted(source_docs, key=score_document, reverse=True)
        
        return sorted_docs

    def _build_retriever(self, top_k: int, selected_documents: Optional[List[str]] = None):
        """
        Create a per-call retriever with enhanced similarity search and optional metadata filter.
        Expects chunks to carry metadata {'source': basename, 'page': int}.
        """
        if self.vector_store is None:
            return None

        where_filter = None
        if selected_documents:
            # Chroma/LC filter format
            where_filter = {"source": {"$in": [os.path.basename(x) for x in selected_documents]}}

        # Enhanced retriever configuration for better context retrieval
        retriever = self.vector_store.as_retriever(
            search_type="similarity",              # Use similarity for better relevance
            search_kwargs={
                "k": top_k,
                "filter": where_filter,
            }
        )
        return retriever
    
    def _standardize_citations(self, answer: str) -> str:
        """Standardize citation formatting throughout the answer."""
        
        # Standardize citation format to be consistent
        # Handle multiple page citations like (Source: file.pdf:1) (Source: file.pdf:2)
        # Convert them to a single citation with multiple pages
        answer = re.sub(r'\(Source:\s*([^:]+):(\d+)\)\s*\(Source:\s*\1:(\d+)\)', r'(Source: \1:\2, \3)', answer)
        
        # Handle single page citations
        answer = re.sub(r'\(Source:\s*([^:]+):(\d+)\)', r'(Source: \1:\2)', answer)
        answer = re.sub(r'\(Source:\s*([^)]+)\)', r'(Source: \1)', answer)
        
        # Ensure proper spacing around citations
        answer = re.sub(r'([^ ])\(Source:', r'\1 (Source:', answer)
        answer = re.sub(r'\(Source:([^ ])', r'(Source: \1', answer)
        
        # Fix any remaining inconsistent spacing
        answer = re.sub(r'\(Source:\s+', r'(Source: ', answer)
        answer = re.sub(r'\s+\)', r')', answer)
        
        return answer

    def _post_process_answer(self, answer: str, citations: List[Dict[str, Any]]) -> str:
        """Enhanced post-processing of the answer for better formatting and citation handling."""
        if not answer:
            return answer
        
        # Fix incomplete citations
        if answer.endswith("(") or answer.endswith("( "):
            if citations:
                c = citations[0]
                citation_str = f"Source: {c['source']}:{c['page']})" if c.get('page') else f"Source: {c['source']})"
                answer = answer.rstrip("( ") + f"({citation_str}"
            else:
                answer = answer.rstrip("( ") + "(citation missing)"
        
        # Close any unclosed parentheses
        if answer.count('(') > answer.count(')'):
            answer = answer + ")"
        
        # Ensure proper formatting for structured responses
        lines = answer.split('\n')
        formatted_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Format section headers with proper markdown and consistent bold formatting
            if line.upper() in ['SUMMARY', 'KEY FINDINGS', 'DETAILED ANALYSIS', 'RELEVANT PROVISIONS', 'IMPLICATIONS']:
                # Remove any existing bold formatting and standardize
                clean_header = line.replace('**', '').replace('*', '').strip()
                # Use simple header format without redundant asterisks
                formatted_lines.append(f"\n## {clean_header}")
            elif line.endswith(':') and len(line) < 50 and line.upper() not in ['SUMMARY:', 'KEY FINDINGS:', 'DETAILED ANALYSIS:', 'RELEVANT PROVISIONS:', 'IMPLICATIONS:']:
                formatted_lines.append(f"\n### {line}")
            else:
                formatted_lines.append(line)
        
        # Fix bullet point consistency
        answer = '\n'.join(formatted_lines)
        
        # Ensure consistent bullet points
        answer = answer.replace('•', '*')
        
        # Add proper spacing around citations
        # Add space before citations if missing
        answer = re.sub(r'([^ ])\(Source:', r'\1 (Source:', answer)
        
        # Ensure proper spacing between sections
        answer = re.sub(r'\n## ([^\n]+)\n', r'\n\n## \1\n\n', answer)
        
        # Fix multiple consecutive blank lines
        answer = re.sub(r'\n{3,}', r'\n\n', answer)
        
        # Ensure proper spacing between sections
        answer = re.sub(r'\n## ([^\n]+)\n', r'\n\n## \1\n\n', answer)
        
        # Remove any remaining redundant asterisks from headers
        answer = re.sub(r'## \*\*([^*]+)\*\*', r'## \1', answer)
        
        # Remove redundant asterisks from bullet points
        answer = re.sub(r'\* \*\*([^*]+)\*\*:', r'* \1:', answer)
        answer = re.sub(r'\* \*\*([^*]+)\*\*', r'* \1', answer)
        
        # Standardize citations
        answer = self._standardize_citations(answer)
        
        # Ensure proper line breaks after each section
        answer = re.sub(r'## ([^\n]+)\n([^#])', r'## \1\n\n\2', answer)
        
        # Clean up any remaining formatting issues
        answer = re.sub(r'\n{4,}', r'\n\n', answer)
        
        return answer
    
    def _calculate_confidence(self, citations: List[Dict[str, Any]], source_docs: List, answer: str) -> str:
        """Calculate confidence based on multiple factors."""
        if not citations:
            return "low"
        
        # Factor 1: Number of citations
        citation_score = min(len(citations) / 3, 1.0)
        
        # Factor 2: Number of unique sources
        unique_sources = len({c["source"] for c in citations if c["source"]})
        source_score = min(unique_sources / 2, 1.0)
        
        # Factor 3: Answer length and structure
        answer_length = len(answer.split())
        structure_score = min(answer_length / 200, 1.0)  # Prefer longer, more detailed answers
        
        # Factor 4: Presence of structured elements
        has_structure = any(keyword in answer.upper() for keyword in ['SUMMARY', 'KEY FINDINGS', 'DETAILED ANALYSIS'])
        structure_bonus = 0.2 if has_structure else 0
        
        # Factor 5: Citation quality
        citation_quality = sum(1 for c in citations if c.get('page') is not None) / len(citations)
        
        # Calculate overall confidence
        overall_score = (citation_score * 0.3 + source_score * 0.2 + structure_score * 0.2 + 
                        structure_bonus + citation_quality * 0.3)
        
        if overall_score >= 0.8:
            return "high"
        elif overall_score >= 0.5:
            return "medium"
        else:
            return "low"
    
    def _assess_analysis_quality(self, answer: str, citations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess the quality of the legal analysis."""
        quality_metrics = {
            "has_structure": False,
            "has_citations": len(citations) > 0,
            "citation_count": len(citations),
            "unique_sources": len({c["source"] for c in citations if c["source"]}),
            "answer_length": len(answer.split()),
            "has_legal_terms": False,
            "has_practical_implications": False
        }
        
        # Check for structured response
        quality_metrics["has_structure"] = any(
            keyword in answer.upper() for keyword in ['SUMMARY', 'KEY FINDINGS', 'DETAILED ANALYSIS']
        )
        
        # Check for legal terminology
        legal_terms = ['shall', 'must', 'may', 'required', 'prohibited', 'liability', 'jurisdiction', 
                      'compliance', 'enforcement', 'penalty', 'breach', 'contract', 'agreement']
        quality_metrics["has_legal_terms"] = any(term in answer.lower() for term in legal_terms)
        
        # Check for practical implications
        implication_indicators = ['implication', 'impact', 'consequence', 'result', 'effect', 'outcome']
        quality_metrics["has_practical_implications"] = any(
            indicator in answer.lower() for indicator in implication_indicators
        )
        
        return quality_metrics

    def _analyze_question(self, question: str) -> Dict[str, Any]:
        """Analyze the question to determine response format and requirements."""
        question_lower = question.lower()
        
        # Check for word/character limits
        word_limit = None
        char_limit = None
        
        # Look for word limits
        word_match = re.search(r'(\d+)\s*words?', question_lower)
        if word_match:
            word_limit = int(word_match.group(1))
        
        # Look for character limits
        char_match = re.search(r'(\d+)\s*characters?', question_lower)
        if char_match:
            char_limit = int(char_match.group(1))
        
        # Check for specific request types
        is_summary = any(word in question_lower for word in ['summarize', 'summary', 'brief', 'short', 'concise'])
        is_detailed = any(word in question_lower for word in ['detailed', 'comprehensive', 'full', 'complete'])
        is_specific = any(word in question_lower for word in ['specific', 'particular', 'exact'])
        
        # Determine response style
        if word_limit or char_limit or is_summary:
            response_style = "concise"
        elif is_detailed:
            response_style = "detailed"
        else:
            response_style = "standard"
        
        return {
            "word_limit": word_limit,
            "char_limit": char_limit,
            "is_summary": is_summary,
            "is_detailed": is_detailed,
            "response_style": response_style
        }

    def _generate_dynamic_prompt(self, question: str, context: str) -> str:
        """Generates a dynamic prompt based on the question and context."""
        analysis = self._analyze_question(question)
        
        prompt_template = """
You are an expert legal research assistant specializing in residential lease agreements. Your task is to provide a response to the user's question based on the provided document excerpts.

## RESPONSE FORMAT REQUIREMENTS:

1. **STRUCTURE YOUR ANSWER** with clear sections using headers:
   - SUMMARY (2-3 sentences overview focusing on key lease terms)
   - KEY FINDINGS (bullet points of main lease provisions)
   - DETAILED ANALYSIS (comprehensive explanation of lease terms)
   - RELEVANT PROVISIONS (specific clauses/sections with exact text)
   - IMPLICATIONS (practical impact for tenant/landlord)

2. **CITATION FORMAT**: Every factual statement must end with (Source: [filename]:[page])
   - Use exact page numbers when available
   - If page number is missing, use (Source: [filename])
   - Never leave incomplete citations
   - Use consistent citation format throughout

3. **LEASE-SPECIFIC GUIDELINES**:
   - Always identify: lease term dates, rent amount, payment schedule, security deposit
   - Highlight: tenant obligations, landlord obligations, property details
   - Note: utilities, parking, maintenance, termination conditions
   - Include: property address, tenant/landlord names if available

4. **FORMATTING GUIDELINES**:
   - Use **bold** for emphasis on key terms and section headers
   - Use bullet points (*) consistently for all lists
   - Use numbered lists for sequential items
   - Use blockquotes (>) for direct quotes from the lease
   - Add proper line breaks between sections
   - Use consistent spacing throughout

5. **MARKDOWN FORMATTING**:
   - Start each section with ## HEADER
   - Add blank lines between sections
   - Use consistent bullet point style (*)
   - Ensure proper spacing around citations

## RESPONSE QUALITY REQUIREMENTS:

- Be thorough but concise
- Prioritize accuracy over brevity
- Use precise legal terminology
- Provide practical implications
- Cross-reference related provisions when relevant
- Note any ambiguities or areas requiring clarification

## IF INFORMATION IS INSUFFICIENT:
If key lease information (rent, dates, property details) is missing, clearly state what information is available and what is missing. Do not make assumptions about missing information.

## QUESTION:
{question}

## DOCUMENT EXCERPTS:
{context}

Now provide a comprehensive, well-structured lease analysis following the format requirements above. Ensure proper markdown formatting with clear section separation and consistent citation style.
"""
        
        return prompt_template.format(question=question, context=context)

    def _generate_concise_prompt(self, question: str, context: str, analysis: Dict[str, Any]) -> str:
        """Generates a concise prompt for summary or limited responses."""
        
        # Build length constraint instructions
        length_constraint = ""
        if analysis["word_limit"]:
            length_constraint = f"IMPORTANT: Your entire response must be EXACTLY {analysis['word_limit']} words or fewer. Count your words carefully and stop at the limit. "
        elif analysis["char_limit"]:
            length_constraint = f"IMPORTANT: Your entire response must be EXACTLY {analysis['char_limit']} characters or fewer. Count your characters carefully and stop at the limit. "
        
        # Build style instructions
        style_instruction = ""
        if analysis["is_summary"]:
            style_instruction = "Provide a concise summary focusing on the most important lease terms. Use simple, clear language. "
        
        prompt_template = f"""
You are an expert legal research assistant specializing in residential lease agreements. Your task is to provide a {analysis['response_style']} response to the user's question based on the provided document excerpts.

{length_constraint}{style_instruction}

## RESPONSE FORMAT REQUIREMENTS:

1. **STRUCTURE YOUR ANSWER** with clear sections using headers:
   - SUMMARY (2-3 sentences overview focusing on key lease terms)
   - KEY FINDINGS (bullet points of main lease provisions)
   - DETAILED ANALYSIS (comprehensive explanation of lease terms)
   - RELEVANT PROVISIONS (specific clauses/sections with exact text)
   - IMPLICATIONS (practical impact for tenant/landlord)

2. **CITATION FORMAT**: Every factual statement must end with (Source: [filename]:[page])
   - Use exact page numbers when available
   - If page number is missing, use (Source: [filename])
   - Never leave incomplete citations
   - Use consistent citation format throughout

3. **LEASE-SPECIFIC GUIDELINES**:
   - Always identify: lease term dates, rent amount, payment schedule, security deposit
   - Highlight: tenant obligations, landlord obligations, property details
   - Note: utilities, parking, maintenance, termination conditions
   - Include: property address, tenant/landlord names if available

4. **FORMATTING GUIDELINES**:
   - Use **bold** for emphasis on key terms and section headers
   - Use bullet points (*) consistently for all lists
   - Use numbered lists for sequential items
   - Use blockquotes (>) for direct quotes from the lease
   - Add proper line breaks between sections
   - Use consistent spacing throughout

5. **MARKDOWN FORMATTING**:
   - Start each section with ## HEADER (no bold formatting)
   - Add blank lines between sections for readability
   - Use consistent bullet point style (*)
   - Ensure proper spacing around citations
   - IMPORTANT: Add a blank line after each section header before starting content

## RESPONSE QUALITY REQUIREMENTS:

- Be thorough but concise
- Prioritize accuracy over brevity
- Use precise legal terminology
- Provide practical implications
- Cross-reference related provisions when relevant
- Note any ambiguities or areas requiring clarification

## IF INFORMATION IS INSUFFICIENT:
If key lease information (rent, dates, property details) is missing, clearly state what information is available and what is missing. Do not make assumptions about missing information.

## QUESTION:
{{question}}

## DOCUMENT EXCERPTS:
{{context}}

Now provide a {analysis['response_style']}, well-structured lease analysis following the format requirements above. Ensure proper markdown formatting with clear section separation and consistent citation style.

**FORMATTING EXAMPLE:**
```
## SUMMARY

This is the summary content with proper spacing.

## KEY FINDINGS

* First finding (Source: file.pdf:1)
* Second finding (Source: file.pdf:2)

## DETAILED ANALYSIS

This is the detailed analysis with proper line breaks.
```
"""
        
        return prompt_template.format(question=question, context=context)

    def _apply_length_constraints(self, answer: str, analysis: Dict[str, Any]) -> str:
        """Applies word and character limits to the answer if specified in the question."""
        if not answer:
            return answer
        
        if analysis["word_limit"]:
            words = answer.split()
            if len(words) > analysis["word_limit"]:
                # Truncate to the specified word limit
                truncated_words = words[:analysis["word_limit"]]
                answer = " ".join(truncated_words)
                
                # Try to end at a complete sentence
                if not answer.endswith('.') and not answer.endswith('!') and not answer.endswith('?'):
                    # Find the last complete sentence
                    sentences = answer.split('. ')
                    if len(sentences) > 1:
                        # Remove the incomplete last sentence
                        answer = '. '.join(sentences[:-1]) + '.'
                
                # Add ellipsis to indicate truncation
                if not answer.endswith('...'):
                    answer += "..."
        
        if analysis["char_limit"]:
            if len(answer) > analysis["char_limit"]:
                # Try to truncate at a word boundary
                truncated = answer[:analysis["char_limit"]]
                last_space = truncated.rfind(' ')
                if last_space > analysis["char_limit"] * 0.8:  # If we can find a space in the last 20%
                    truncated = truncated[:last_space]
                
                answer = truncated
                # Add ellipsis to indicate truncation
                if not answer.endswith('...'):
                    answer += "..."
        
        return answer

# Global instance
ai_service = LegalAIService()
