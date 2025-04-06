import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def extract_text_from_pdf(file_path):
    from PyPDF2 import PdfReader
    reader = PdfReader(file_path)
    return "\n".join(page.extract_text() for page in reader.pages if page.extract_text())


def summarize_text(file_path):
    return f"Auto-summary of JD from file: {file_path}"


def calculate_match_score(jd_text, cv_text):
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    if not jd_text.strip() or not cv_text.strip():
        return 0.0

    jd_text = jd_text.lower().strip()
    cv_text = cv_text.lower().strip()

    vectorizer = TfidfVectorizer(stop_words='english')
    vectors = vectorizer.fit_transform([jd_text, cv_text])

    if vectors.shape[1] == 0:
        return 0.0  # No shared vocabulary

    score = cosine_similarity(vectors[0], vectors[1])[0][0]
    return round(score * 100, 2)



def send_email(to_email, candidate_name):
    # Your Gmail account credentials
    sender_email = "anishdawkhar9045@gmail.com"
    sender_password = "xlthcdyycxpcigim"  # Use App Password, not your Gmail login

    subject = "Interview Invitation from SmartHire AI"
    body = f"""
    Dear {candidate_name},

    Congratulations! Based on your resume, you have been shortlisted for the next stage of the interview process.

    We will be in touch shortly to schedule the time.

    Regards,
    SmartHire AI Team
    """

    message = MIMEMultipart()
    message['From'] = sender_email
    message['To'] = to_email
    message['Subject'] = subject

    message.attach(MIMEText(body, 'plain'))

    try:
        # Connect to the Gmail SMTP server and send email
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, to_email, message.as_string())
        server.quit()
    except Exception as e:
        print("Email send failed:", str(e))
        raise