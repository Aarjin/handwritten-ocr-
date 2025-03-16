import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaDownload, FaCopy, FaPen, FaCheck } from "react-icons/fa";
import '../styles/DocumentView.css';
import api from "../api"; // Make sure you import your API client

function DocumentView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { documentId } = useParams(); // Get document ID from URL
  
  // Use location state if available, otherwise set default values
  const [fileName, setFileName] = useState(location.state?.fileName || "Document");
  const [imageUrl, setImageUrl] = useState(location.state?.image_url || null);
  const [processingStatus, setProcessingStatus] = useState(location.state?.processingStatus || "pending");

  const [isProcessingComplete, setIsProcessingComplete] = useState(processingStatus === "complete");
  const [transcriptionData, setTranscriptionData] = useState({ content: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(!location.state); // Loading state if no data passed

  // Fetch document data if navigated directly to URL (without state)
  useEffect(() => {
    if (documentId && !location.state) {
      setIsLoading(true);
      fetchDocumentData();
    }
  }, [documentId]);

  // Function to fetch document data by ID
  const fetchDocumentData = async () => {
    try {
      const response = await api.get(`api/documents/${documentId}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
        }
      });
      
      const data = response.data;
      
      // Update state with fetched data
      setFileName(data.file_name || `Document ${documentId}`);
      setImageUrl(data.image || data.imageUrl);
      setProcessingStatus(data.processing_status || "complete");
      setIsProcessingComplete(data.processing_status === "complete" || true);
      
      if (data.transcription_data) {
        // Format transcription data based on your API response structure
        setTranscriptionData(data.transcription_data.content ? 
          data.transcription_data : 
          { content: data.transcription_data.text ? 
            [{ text: data.transcription_data.text }] : 
            []
          }
        );
      }
      
    } catch (error) {
      console.error("Error fetching document:", error);
      setStatusMessage("Error loading document");
    } finally {
      setIsLoading(false);
    }
  };

  const showStatus = (message) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 2000);
  };

  // Get current transcript content
  const getTranscriptContent = () => {
    return isEditing 
      ? editableContent 
      : transcriptionData.content?.map(item => item.text).join('\n') || '';
  };

  // Handle export of transcription
  const handleExport = () => {
    const textContent = getTranscriptContent();
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName ? fileName.split('.')[0] : 'document'}_transcription.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Toggle editing mode
  const toggleEditMode = () => {
    if (isEditing) {
      // Save the edited content
      if (editableContent.trim()) {
        setTranscriptionData({
          content: editableContent.split('\n').map(text => ({ text }))
        });
        
        // Optional: Send updated transcription to backend
        saveTranscriptionData();
        
        showStatus("Saved!");
      }
    } else {
      setEditableContent(transcriptionData.content?.map(item => item.text).join('\n') || '');
    }
    setIsEditing(!isEditing);
  };
  
  // Save updated transcription data to backend
  const saveTranscriptionData = async () => {
    if (!documentId) return;
    
    try {
      await api.patch(`api/documents/${documentId}/`, {
        transcription_data: {
          content: editableContent.split('\n').map(text => ({ text }))
        }
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
        }
      });
    } catch (error) {
      console.error("Error saving transcription:", error);
    }
  };

  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(getTranscriptContent())
      .then(() => showStatus("Copied!"));
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="document-view-container">
        <div className="document-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            <FaArrowLeft /> Loading Document...
          </button>
        </div>
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading document data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-view-container">
      {/* Simplified Header */}
      <div className="document-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> {fileName || `Document ${documentId}`}
        </button>
      </div>

      {/* Processing Status */}
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
          <button className="export-button" onClick={handleExport}>
            <FaDownload /> Export results
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="document-content">
        {/* Document preview */}
        <div className="document-preview">
          {imageUrl ? (
            <img src={imageUrl} alt="Document preview" className="document-image" />
          ) : (
            <div className="placeholder-image">
              <div className="placeholder-icon">📷</div>
            </div>
          )}
        </div>

        {/* Transcription */}
        <div className="document-data">
          <div className="data-header">
            <h3>Extracted Text</h3>
            <div className="data-actions">
              <button className="action-button" onClick={handleCopy} title="Copy to clipboard">
                <FaCopy />
              </button>
              <button className="action-button" onClick={toggleEditMode} title={isEditing ? "Save changes" : "Edit transcript"}>
                {isEditing ? <FaCheck /> : <FaPen />}
              </button>
              {statusMessage && <span className="status-message">{statusMessage}</span>}
            </div>
          </div>

          {/* Transcription Content */}
          <div className="transcription-content">
            {isEditing ? (
              <textarea 
                className="editable-transcription"
                value={editableContent}
                onChange={(e) => setEditableContent(e.target.value)}
                placeholder="Text will be provided here when OCR model is integrated."
              />
            ) : (
              <div className="transcript-display">
                {transcriptionData.content && transcriptionData.content.length > 0 ? (
                  transcriptionData.content.map((line, index) => (
                    <p key={index} className="transcription-line">{line.text}</p>
                  ))
                ) : (
                  <p className="empty-transcript">No transcription available. Click the edit button to add content.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentView;