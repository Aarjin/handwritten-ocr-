import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaDownload, FaCopy, FaPen, FaCheck, FaBold, FaItalic, FaUnderline, FaListUl, FaListOl } from "react-icons/fa";
import { BsChevronDown } from "react-icons/bs";
import '../styles/DocumentView.css';
import documentApi from "../api";

function DocumentView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { documentId } = useParams();
  const editorRef = useRef(null);
  const exportMenuRef = useRef(null);
  
  const [fileName, setFileName] = useState("Loading...");
  const [imageUrl, setImageUrl] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("pending");
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableContent, setEditableContent] = useState('');
  const [displayContent, setDisplayContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showProcessingMessage, setShowProcessingMessage] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (documentId) {
      setIsLoading(true);
      fetchDocumentData();
    } else {
      console.error("No document ID provided");
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    // This effect ensures the editor is initialized with the content when entering edit mode
    if (isEditing && editorRef.current) {
      editorRef.current.innerHTML = displayContent;
    }
  }, [isEditing, displayContent]);

  // Hide processing message after 5 seconds once processing is complete
  useEffect(() => {
    if (isProcessingComplete && showProcessingMessage) {
      const timer = setTimeout(() => {
        setShowProcessingMessage(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isProcessingComplete, showProcessingMessage]);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchDocumentData = async () => {
    try {
      const response = await documentApi.getDocument(documentId);
      const data = response.data;
      
      setFileName(data.filename || `Document ${documentId}`);
      setImageUrl(data.imageUrl);
      setProcessingStatus(data.processing_status || "complete");
      setIsProcessingComplete(data.processing_status === "complete");
      
      const content = data.extracted_text_content || 'Sample text for transcription. This is a placeholder until OCR model is integrated.';
      setEditableContent(content);
      setDisplayContent(content);
    } catch (error) {
      console.error("Error fetching document:", error);
      if (error.response?.status === 404) {
        navigate('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportHTML = () => {
    // For rich text, we need to get the HTML content
    const htmlContent = displayContent;
    
    // Create a blob with HTML content to preserve formatting
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName.split('.')[0]}_transcription.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setShowExportMenu(false);
  };

  const handleExportTXT = () => {
    // Convert HTML to plain text by removing HTML tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = displayContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Create a blob with plain text content
    const blob = new Blob([plainText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName.split('.')[0]}_transcription.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setShowExportMenu(false);
  };

  const handleExportDOCX = () => {
    // This requires a library like docx-js or a backend service
    // For a frontend-only solution, we'll create a simple DOCX-like HTML file
    // that Word can open (not perfect but functional)
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${fileName.split('.')[0]}_transcription</title>
      </head>
      <body>
        ${displayContent}
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName.split('.')[0]}_transcription.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setShowExportMenu(false);
  };

  const toggleExportMenu = () => {
    setShowExportMenu(!showExportMenu);
  };

  const toggleEditMode = () => {
    if (isEditing) {
      saveTranscriptionData();
    } else {
      setIsEditing(true);
    }
  };

  const saveTranscriptionData = async () => {
    if (!documentId) return;

    try {
      // Get the HTML content from the contentEditable div
      const htmlContent = editorRef.current ? editorRef.current.innerHTML : editableContent;
      
      await documentApi.updateDocument(documentId, {
        text: htmlContent
      });
      
      // Update the display content immediately with the edited content
      setDisplayContent(htmlContent);
      setEditableContent(htmlContent);
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving transcription:", error);
    }
  };

  const handleCopy = () => {
    const htmlContent = displayContent;
    navigator.clipboard.writeText(htmlContent);
  };

  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  // Special handler for headings
  const applyHeading = (level) => {
    document.execCommand('formatBlock', false, `h${level}`);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleEditorChange = () => {
    // Keep track of changes in real-time
    if (editorRef.current) {
      setEditableContent(editorRef.current.innerHTML);
    }
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
      </div>

      {isProcessingComplete && (
        <div className="processing-status-container">
          {showProcessingMessage ? (
            <>
              <div className="processing-status">
                <div className="status-icon">✓</div>
                <div className="status-message">
                  <h3>Processing complete</h3>
                  <p>Your results are ready. Preview your results below, or click the Export button to download.</p>
                </div>
              </div>
              <div className="export-dropdown" ref={exportMenuRef}>
                <button className="export-button" onClick={toggleExportMenu} disabled={isEditing}>
                  <FaDownload /> Export results <BsChevronDown />
                </button>
                {showExportMenu && (
                  <div className="export-menu">
                    <button onClick={handleExportHTML}>HTML Format</button>
                    <button onClick={handleExportTXT}>Plain Text (.txt)</button>
                    <button onClick={handleExportDOCX}>Word Document (.docx)</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="export-only-container">
              <div className="export-dropdown" ref={exportMenuRef}>
                <button className="export-button" onClick={toggleExportMenu} disabled={isEditing}>
                  <FaDownload /> Export results <BsChevronDown />
                </button>
                {showExportMenu && (
                  <div className="export-menu">
                    <button onClick={handleExportHTML}>HTML Format</button>
                    <button onClick={handleExportTXT}>Plain Text (.txt)</button>
                    <button onClick={handleExportDOCX}>Word Document (.docx)</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

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
              <button className="action-button" onClick={handleCopy} title="Copy to clipboard" disabled={isEditing}>
                <FaCopy />
              </button>
              <button className="action-button" onClick={toggleEditMode} title={isEditing ? "Save changes" : "Edit transcript"}>
                {isEditing ? <FaCheck /> : <FaPen />}
              </button>
            </div>
          </div>

          {isEditing && (
            <div className="rich-text-toolbar">
              <button onClick={() => executeCommand('bold')} className="toolbar-button" title="Bold">
                <FaBold />
              </button>
              <button onClick={() => executeCommand('italic')} className="toolbar-button" title="Italic">
                <FaItalic />
              </button>
              <button onClick={() => executeCommand('underline')} className="toolbar-button" title="Underline">
                <FaUnderline />
              </button>
              <div className="toolbar-divider"></div>
              <button onClick={() => executeCommand('insertUnorderedList')} className="toolbar-button" title="Bullet List">
                <FaListUl />
              </button>
              <button onClick={() => executeCommand('insertOrderedList')} className="toolbar-button" title="Numbered List">
                <FaListOl />
              </button>
              <div className="toolbar-divider"></div>
              <select 
                onChange={(e) => applyHeading(e.target.value)}
                className="heading-select"
                defaultValue=""
              >
                <option value="" disabled>Heading</option>
                <option value="1">Heading 1</option>
                <option value="2">Heading 2</option>
                <option value="3">Heading 3</option>
              </select>
            </div>
          )}

          <div className="transcription-content">
            {isEditing ? (
              <div
                ref={editorRef}
                className="rich-text-editor"
                contentEditable={true}
                onInput={handleEditorChange}
                placeholder="Type here..."
              />
            ) : (
              <div 
                className="rich-text-display"
                dangerouslySetInnerHTML={{ __html: displayContent }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentView;