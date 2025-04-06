import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import jsPDF from 'jspdf';

export default function App() {
  const [jdFile, setJdFile] = useState(null);
  const [cvFiles, setCvFiles] = useState([]);
  const [jdSummary, setJdSummary] = useState('');
  const [matchScores, setMatchScores] = useState([]);
  const [emailStatus, setEmailStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cvProgresses, setCvProgresses] = useState({});
  const [candidateEmails, setCandidateEmails] = useState({});

  const API_BASE = 'http://localhost:8000';

  const jdRef = useRef(null);
  const cvRef = useRef(null);
  const summaryRef = useRef(null);
  const matchRef = useRef(null);
  const reportsRef = useRef(null);

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onDropCVs = useCallback((acceptedFiles) => {
    const files = acceptedFiles.map((file, idx) => ({
      file,
      name: `Candidate ${cvFiles.length + idx + 1}`
    }));
    setCvFiles((prev) => [...prev, ...files]);
  }, [cvFiles]);

  const onDropJD = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) setJdFile(acceptedFiles[0]);
  }, []);

  const { getRootProps: getRootCVProps, getInputProps: getCVInputProps } = useDropzone({ onDrop: onDropCVs });
  const { getRootProps: getRootJDProps, getInputProps: getJDInputProps } = useDropzone({ onDrop: onDropJD });

  const handleJDUpload = async () => {
    if (!jdFile) return;
    const formData = new FormData();
    formData.append('file', jdFile);
    formData.append('title', jdFile.name);

    const res = await axios.post(`${API_BASE}/upload_jd/`, formData, {
      onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded / p.total) * 100))
    });
    setJdSummary(res.data.summary);
    setUploadProgress(0);
  };

  const handleCVUpload = async () => {
    const uploadPromises = cvFiles.map((cv) => {
      const formData = new FormData();
      formData.append('file', cv.file);
      formData.append('name', cv.name);
  
      return axios.post(`${API_BASE}/upload_cv/`, formData, {
        onUploadProgress: (p) => {
          setCvProgresses((prev) => ({
            ...prev,
            [cv.name]: Math.round((p.loaded / p.total) * 100),
          }));
        }
      });
    });
  
    try {
      await Promise.all(uploadPromises);
      alert('All CVs uploaded');
    } catch (err) {
      console.error('Upload error:', err);
      alert('One or more CVs failed to upload.');
    }
  };
  

  const handleMatch = async () => {
    const scores = [];
    for (let i = 0; i < cvFiles.length; i++) {
      const jdText = jdSummary || 'Sample JD';
      const cvText = 'Sample CV text for testing';
      const formData = new FormData();
      formData.append('jd_text', jdText);
      formData.append('cv_text', cvText);
      const res = await axios.post(`${API_BASE}/match/`, formData);
      scores.push({ name: cvFiles[i].name, score: res.data.match_score });
    }
    setMatchScores(scores);
  };

  const handleSendEmail = async (name) => {
    const email = candidateEmails[name];
    if (!email) {
      alert(`Please enter an email for ${name}`);
      return;
    }

    const formData = new FormData();
    formData.append('to_email', email);
    formData.append('candidate_name', name);

    try {
      const res = await axios.post(`${API_BASE}/send_interview/`, formData);
      setEmailStatus(res.data.status);
    } catch (err) {
      setEmailStatus("Failed to send email.");
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text("SmartHire AI - Report Summary", 10, 10);

    // JD Summary
    doc.setFontSize(10);
    doc.text("Job Description Summary:", 10, 20);
    const jdLines = doc.splitTextToSize(jdSummary || "No summary available", 180);
    doc.text(jdLines, 10, 28);

    // Match Scores
    let y = 28 + jdLines.length * 6 + 10;
    doc.text("Candidate Match Scores:", 10, y);
    y += 8;
    [...matchScores]
      .sort((a, b) => b.score - a.score)
      .forEach((item) => {
        doc.text(`${item.name}: ${item.score}%`, 10, y);
        y += 6;
      });

    doc.save("SmartHire_Report.pdf");
  };

  const deleteCV = (index) => {
    const updated = [...cvFiles];
    updated.splice(index, 1);
    setCvFiles(updated);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-700 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 justify-between items-center">
          <h1 className="text-xl font-bold">SmartHire AI</h1>
          <div className="flex flex-wrap gap-2 text-sm font-semibold">
            <button onClick={() => scrollToSection(summaryRef)} className="bg-white text-indigo-700 px-3 py-1 rounded-xl">JD Summary</button>
            <button onClick={() => scrollToSection(matchRef)} className="bg-white text-indigo-700 px-3 py-1 rounded-xl">Match Scores</button>
            <button onClick={() => scrollToSection(reportsRef)} className="bg-white text-indigo-700 px-3 py-1 rounded-xl">Reports</button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto py-10 px-4">
        <div ref={jdRef} className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* JD Upload */}
          <div {...getRootJDProps()} className="border-2 border-dashed p-6 rounded-xl bg-white shadow cursor-pointer">
            <input {...getJDInputProps()} />
            <p className="text-center text-gray-600">Drag & drop Job Description here, or click to upload</p>
            {jdFile && <p className="text-sm mt-2 text-center text-green-600">Selected: {jdFile.name}</p>}
            {uploadProgress > 0 && (
              <CircularProgressbar
                value={uploadProgress}
                text={`${uploadProgress}%`}
                className="w-24 mx-auto mt-4"
                styles={buildStyles({ textSize: '20px' })}
              />
            )}
            <button onClick={handleJDUpload} className="block mx-auto mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl">Upload JD</button>
          </div>

          {/* CV Upload */}
          <div ref={cvRef} {...getRootCVProps()} className="border-2 border-dashed p-6 rounded-xl bg-white shadow cursor-pointer">
            <input {...getCVInputProps()} />
            <p className="text-center text-gray-600">Drag & drop Candidate CVs here, or click to select</p>
            <ul className="text-sm mt-2 max-h-40 overflow-auto">
              {cvFiles.map((cv, index) => (
                <li key={index} className="flex justify-between items-center py-1">
                  <div className="text-gray-700 flex-1">
                    {cv.name}: {cv.file.name}
                    {cvProgresses[cv.name] >= 0 && (
                      <div className="w-24 mt-1">
                        <CircularProgressbar
                          value={cvProgresses[cv.name]}
                          text={`${cvProgresses[cv.name]}%`}
                          styles={buildStyles({ textSize: '18px' })}
                        />
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteCV(index)} className="ml-2 text-red-500 font-bold">❌</button>
                </li>
              ))}
            </ul>
            <button onClick={handleCVUpload} className="block mx-auto mt-4 px-4 py-2 bg-green-600 text-white rounded-xl">Upload CVs</button>
          </div>
        </div>

        {/* JD Summary */}
        {jdSummary && (
          <div ref={summaryRef} className="mt-6 bg-white p-4 rounded-xl shadow">
            <h2 className="font-semibold text-lg mb-1 text-indigo-700">JD Summary:</h2>
            <p className="text-sm whitespace-pre-wrap text-gray-800">{jdSummary}</p>
          </div>
        )}

        <button onClick={downloadPDF} className="mt-2 px-4 py-1 bg-yellow-500 text-white rounded-xl text-sm">
          Download JD Summary (PDF)
        </button>

        {/* Match Score */}
        <div ref={matchRef}>
          <button onClick={handleMatch} className="w-full mt-6 px-6 py-3 bg-purple-700 text-white font-semibold rounded-xl hover:bg-purple-800 transition">
            Calculate Match Scores
          </button>

          {matchScores.length > 0 && (
            <div className="mt-8 bg-white p-6 rounded-xl shadow space-y-4">
              <h3 className="text-lg font-bold text-indigo-600">Candidate Scores & Emails</h3>
              {matchScores.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="ml-4 font-bold text-purple-700">{item.score}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="email"
                      placeholder="Enter email"
                      value={candidateEmails[item.name] || ''}
                      onChange={(e) => setCandidateEmails({ ...candidateEmails, [item.name]: e.target.value })}
                      className="border p-2 rounded-lg w-64"
                    />
                    <button
                      onClick={() => handleSendEmail(item.name)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                    >
                      Send Email
                    </button>
                  </div>
                </div>
              ))}
              {emailStatus && <div className="text-green-600 font-medium text-center">{emailStatus}</div>}
            </div>
          )}
        </div>

        {/* Reports Section */}
        <div ref={reportsRef} className="mt-12 bg-white p-6 rounded-xl shadow">
          <h3 className="text-lg font-bold text-indigo-700 mb-4">Report Summary</h3>

          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-800">Job Description Summary:</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">{jdSummary || "No JD summary available."}</p>
          </div>

          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-2">Candidate Match Scores:</h4>
            {matchScores.length > 0 ? (
              [...matchScores]
                .sort((a, b) => b.score - a.score)
                .map((item, index) => (
                  <div key={index} className="flex justify-between border-b py-2">
                    <span className="text-gray-800 font-medium">{item.name}</span>
                    <span className="text-purple-700 font-bold">{item.score}%</span>
                  </div>
                ))
            ) : (
              <p className="text-sm text-gray-600">No match scores calculated yet.</p>
            )}
          </div>

          <button onClick={downloadPDF} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-xl">
            Download Report (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}


