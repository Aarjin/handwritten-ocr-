import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaDownload, FaCopy, FaPen, FaCheck } from "react-icons/fa";
import '../styles/DocumentView.css';
import documentApi from "../api";

function DocumentView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { documentId } = useParams();
  
  const [fileName, setFileName] = useState("Loading...");
  const [imageUrl, setImageUrl] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("pending");
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (documentId) {
      setIsLoading(true);
      fetchDocumentData();
    }else{
      console.error("No document ID provided");
      setStatusMessage("Error: No document specified");
      setIsLoading(false);
    }
  }, [documentId]);

  const fetchDocumentData = async () => {
    try {
      const response = await documentApi.getDocument(documentId);
      const data = response.data;
      
      setFileName(data.filename || `Document ${documentId}`);
      setImageUrl(data.imageUrl);
      setProcessingStatus(data.processing_status || "complete");
      setIsProcessingComplete(data.processing_status === "complete");
      setEditableContent(data.extracted_text_content || 'Sample text for transcription. This is a placeholder until OCR model is integrated.');
      
    
    } catch (error) {
      console.error("Error fetching document:", error);
      setStatusMessage("Error loading document");
      if (error.response?.status === 404) {
      
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showStatus = (message) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleExport = () => {
    const blob = new Blob([editableContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName.split('.')[0]}_transcription.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showStatus('Exported')
  };

  const toggleEditMode = () => {
    if (isEditing) {
        saveTranscriptionData()
    }else{
      setIsEditing(true)
    }
  }

  
  const saveTranscriptionData = async () => {
    if (!documentId) return;

    setStatusMessage('Saving')

    try {
      await documentApi.updateDocument(documentId, {
        text:editableContent
      });
      
      showStatus("Saved successfully!")
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving transcription:", error);
      const errorMsg = error.response?.data?.error || "Error saving data";
      showStatus(`Save failed: ${errorMsg}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableContent)
      .then(() => showStatus("Copied!"));
  };

  if (isLoading) {
    return (
      <div className="document-view-container loading-container">
        <div className="spinner"></div>
        <p>Loading document...</p>
      </div>
    );
  }

  return (
    <div className="document-view-container">
      <div className="document-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> {fileName}
        </button>
        {statusMessage && !isEditing && <span className="status-message global-status">{statusMessage}</span>}
      </div>

      <div className="processing-status-container">
        <div className="processing-status">
          <div className="status-icon">
            {isProcessingComplete ? "✓" : "⟳"}
          </div>
          <div className="status-message">
            <h3>{isProcessingComplete ? "Processing complete" : "Processing in progress..."}</h3>
            {isProcessingComplete && (
              <p>Your results are ready. Preview your results below, or click the Export button to download.</p>
            )}
          </div>
        </div>
        {isProcessingComplete && (
          <button className="export-button" onClick={handleExport} disabled={isEditing}>
            <FaDownload /> Export results
          </button>
        )}
      </div>

      <div className="document-content">
        <div className="document-preview">
          {imageUrl ? (
            <img src={imageUrl} alt="Document preview" className="document-image" />
          ) : (
            <div className="placeholder-image">
              <div className="placeholder-icon">📷</div>
            </div>
          )}
        </div>

        <div className="document-data">
          <div className="data-header">
            <h3>Extracted Text</h3>
            <div className="data-actions">
            {statusMessage && <span className="status-message action-status">{statusMessage}</span>}
              <button className="action-button" onClick={handleCopy} title="Copy to clipboard" disabled={isEditing}>
                <FaCopy />
              </button>
              <button className="action-button" onClick={toggleEditMode} title={isEditing ? "Save changes" : "Edit transcript"}>
                {isEditing ? <FaCheck /> : <FaPen />}
              </button>
            </div>
          </div>

          <div className="transcription-content">
            <textarea 
              className={`editable-transcription ${!isEditing ? 'read-only' : ''}`}
              value={editableContent}
              onChange={(e) => setEditableContent(e.target.value)}
              placeholder="Enter your transcription text here"
              readOnly={!isEditing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentView;