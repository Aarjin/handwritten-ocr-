import { useState, useRef } from "react";
import { Link,useNavigate } from "react-router-dom";
import {api} from "../api";
import '../styles/UploadFile.css';

function UploadFile() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [uploadImageUrl, setUploadImageUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isDragging,setIsDragging]=useState(false)
  const fileInputRef = useRef(null)

  const handleLogout = () => {
    localStorage.removeItem('ACCESS_TOKEN')
    localStorage.removeItem('REFRESH_TOKEN')
    navigate('/login')
  }


  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    validateAndSetFile(selectedFile)
  }

  const validateAndSetFile= (selectedFile) => {
    if(!selectedFile) return

    if(selectedFile.type !== 'image/jpeg' && selectedFile.type !=='image/png'){
      setError('Please select either jpg or png file formats')
      return
    }
    setFile(selectedFile)
    setError('')
  }

  const removeFile = () => {
    setFile(null)
  }

  const handleDragOver = (e) =>{
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

  const handleImageUpload = async (e) => {
    if (e) e.preventDefault();
    if (!file) return
    
    setLoading(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('image', file)
      
      const response = await api.post('api/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
        }
      })
      
      const imageUrl = response.data.imageUrl || response.data.image
      const documentId = response.data.document_id || response.data.id
      
      setUploadImageUrl(imageUrl)
      setSuccess(true)
      setFile(null)
      
    
      setTimeout(() => {
                  navigate(`/document-view/${documentId}`,{
                    state: {
                      fileName: file.name,
                      image_url: imageUrl,
                    processingStatus:response.data.processing_status || 'complete'}})
                  },2000)
    } catch (error) {
      setError('Failed to upload image')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main">
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