import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from sentence_transformers import SentenceTransformer, util

# Initialize the FastAPI app
app = FastAPI(title="Resume Shortlisting API")

# Get the absolute path to the model directory
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, "model")

# Load the model
print(f"Loading model from {model_path}...")
model = SentenceTransformer(model_path)
print("Model loaded successfully!")

# Define the structure of the incoming data
class MatchRequest(BaseModel):
    job_description: str
    resumes: List[str]

# Create the API Endpoint
@app.post("/match")
async def match_resumes(request: MatchRequest):
    jd_embedding = model.encode(request.job_description, convert_to_tensor=True)
    resume_embeddings = model.encode(request.resumes, convert_to_tensor=True)
    
    # Calculate similarities
    cosine_scores = util.cos_sim(jd_embedding, resume_embeddings)[0]
    
    results = []
    for i, score in enumerate(cosine_scores):
        results.append({
            "resume_id": i + 1,
            "snippet": request.resumes[i][:100] + "...",
            "score": round(score.item(), 4)
        })
    
    # Sort so the highest score is first
    results.sort(key=lambda x: x["score"], reverse=True)
    return {"matches": results}

# To run this: uvicorn resume_api:app --reload --port 8000
