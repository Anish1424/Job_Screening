from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from utils import summarize_text, calculate_match_score, send_email, extract_text_from_pdf
import os
import uuid

app = FastAPI()

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "resume_data"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.post("/upload_jd/")
async def upload_jd(file: UploadFile = File(...), title: str = Form(...)):
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    jd_text = extract_text_from_pdf(file_path)
    summary = summarize_text(file_path)
    
    print(f"✅ JD Uploaded: {file.filename}")
    
    return {
        "summary": summary,
        "jd_text": jd_text
    }


@app.post("/upload_cv/")
async def upload_cv(file: UploadFile = File(...), name: str = Form(...)):
    filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    cv_text = extract_text_from_pdf(file_path)

    print(f"✅ CV Uploaded: {file.filename} for {name}")
    
    return {
        "status": f"Uploaded CV for {name}",
        "cv_text": cv_text
    }


@app.post("/match/")
async def match(jd_text: str = Form(...), cv_text: str = Form(...)):
    print("\n===== JD TEXT SAMPLE =====")
    print(jd_text[:300])
    print("\n===== CV TEXT SAMPLE =====")
    print(cv_text[:300])
    
    score = calculate_match_score(jd_text, cv_text)
    print("✅ Match Score:", score)
    
    return {"match_score": score}


@app.post("/send_interview/")
async def send_invite(to_email: str = Form(...), candidate_name: str = Form(...)):
    try:
        send_email(to_email, candidate_name)
        print(f"📧 Email sent to {to_email} for {candidate_name}")
        return {"status": f"Interview email sent to {to_email}"}
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send email")
