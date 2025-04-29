import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import '../styles/UploadFile.css';

/**
 * Handles file uploads for OCR processing with drag-drop support,
 * language selection, and file validation
 */
function UploadFile() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [uploadImageUrl, setUploadImageUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [language, setLanguage] = useState("english") // Default language
  const fileInputRef = useRef(null)

  const handleLogout = () => {
    localStorage.removeItem('ACCESS_TOKEN')
    localStorage.removeItem('REFRESH_TOKEN')
    navigate('/')
  }

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value)
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    validateAndSetFile(selectedFile)
  }

  /**
   * Validates file type (only accepts JPG and PNG)
   */
  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return

    if (selectedFile.type !== 'image/jpeg' && selectedFile.type !== 'image/png') {
      setError('Please select either jpg or png file formats')
      return
    }
    setFile(selectedFile)
    setError('')
  }

  const removeFile = () => {
    setFile(null)
  }

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
  }

  /**
   * Uploads image to the server and redirects to document view on success.
   * Includes the language parameter for OCR processing.
   */
  const handleImageUpload = async (e) => {
    if (e) e.preventDefault();
    if (!file) return
    
    setLoading(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('language', language)
      
      const response = await api.post('api/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
        }
      })
      
      // Handle different API response formats
      const imageUrl = response.data.imageUrl || response.data.image
      const documentId = response.data.document_id || response.data.id
      
      setUploadImageUrl(imageUrl)
      setSuccess(true)
      setFile(null)
      
      // Short delay to show success message before redirect
      setTimeout(() => {
        navigate(`/document-view/${documentId}`, {
          state: {
            fileName: file.name,
            image_url: imageUrl,
            processingStatus: response.data.processing_status || 'complete',
            language: language 
          }
        })
      }, 2000)
    } catch (error) {
      setError('Failed to upload image')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main">
      {/* Navigation */}
      <nav className="navbar">
        <button className="logout-button" onClick={handleLogout}>Logout</button>
        <div className="navbar-menu">
          <Link to="/upload" className={location.pathname === "/upload" ? "active" : ""}>
            Upload
          </Link>
          <Link to="/dashboard" className={location.pathname === "/dashboard" ? "active" : ""}>
            My Documents
          </Link>
        </div>
      </nav>
      
      <div className="upload-container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Language Selection */}
        <div className="language-selection">
          <h3>Select Language</h3>
          <div className="language-options">
            <label className={`language-option ${language === "english" ? "selected" : ""}`}>
              <input
                type="radio"
                name="language"
                value="english"
                checked={language === "english"}
                onChange={handleLanguageChange}
              />
              <span className="language-name">English</span>
            </label>
            <label className={`language-option ${language === "nepali" ? "selected" : ""}`}>
              <input
                type="radio"
                name="language"
                value="nepali"
                checked={language === "nepali"}
                onChange={handleLanguageChange}
              />
              <span className="language-name">नेपाली (Nepali)</span>
            </label>
          </div>
        </div>

        {/* File Drop Area */}
        <div 
          className={`file-drop-area ${isDragging ? 'dragging' : ''}`}
          onClick={() => fileInputRef.current.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png"
            className="file-input"/>

          <div className="upload-icon">+</div>

          <p className="upload-text">
            <strong>Drag file here or click to browse</strong>
          </p>

          <p className="upload-format"> Supported formats: JPG and PNG </p>
        </div>

        {file && (
          <div className="selected-files">
            <h3>Selected File</h3>
            <ul className="file-list">
              <li>
                <div>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
                <button 
                  type="button" 
                  className="remove-file"
                  onClick={removeFile}>
                  ×
                </button>
              </li>
            </ul>
          </div>
        )}

        {file && (
          <div className="upload-actions">
            <button 
              onClick={handleImageUpload} 
              disabled={loading}>
              {loading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        )}

        {success && (
          <div className="success-message">
            File uploaded successfully!
          </div>
        )}

        {uploadImageUrl && (
          <div className="uploaded-image-section">
            <h3>Uploaded Image</h3>
            <div className="image-preview">
              <img 
                src={uploadImageUrl} 
                alt="Uploaded"/>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadFile;