import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import '../styles/Home.css';

function Home() {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploadImageUrl, setUploadImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('ACCESS_TOKEN');
    localStorage.removeItem('REFRESH_TOKEN');
    navigate('/login');
  };

  const validateAndSetFiles = (selectedFiles) => {
    // Filter for image files only (jpg and png)
    const imageFiles = selectedFiles.filter(file => 
      file.type === 'image/jpeg' || file.type === 'image/png'
    );
    
    if (imageFiles.length !== selectedFiles.length) {
      setError('Only .jpg and .png files are allowed');
    } else {
      setError('');
    }
    
    if (imageFiles.length > 0) {
      setFiles(imageFiles);
      setSuccess(false);
    }
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    validateAndSetFiles(selectedFiles);
  };

  const removeFile = (index) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e) => {
    if (e) e.preventDefault();
    if (files.length === 0) return;
    
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('image', files[0]); // Using the first file
      
      const response = await api.post('api/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
        }
      });
      
      setUploadImageUrl(response.data.imageUrl);
      setSuccess(true);
      setFiles([]);
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main">
      <nav className="navbar">
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </nav>
      
      <div className="upload-container">
        <div 
          className="file-drop-area"
          onClick={() => fileInputRef.current.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png"
            multiple
            className="file-input"
          />
          <div className="upload-icon">+</div>
          <p className="upload-text">
            <strong>Drag files here or click to browse</strong>
          </p>
          <p className="upload-format">
            Supported formats: JPG and PNG
          </p>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {files.length > 0 && (
          <div className="selected-files">
            <h3>Selected Files ({files.length})</h3>
            <ul className="file-list">
              {files.map((file, index) => (
                <li key={index}>
                  <div>
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                  <button 
                    type="button" 
                    className="remove-file"
                    onClick={() => removeFile(index)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {files.length > 0 && (
          <div className="upload-actions">
            <button 
              onClick={handleImageUpload} 
              disabled={loading}
            >
              {loading ? 'Uploading...' : 'Upload Files'}
            </button>
          </div>
        )}
        
        {success && (
          <div className="success-message">
            Files uploaded successfully!
          </div>
        )}
        
        {uploadImageUrl && (
          <div className="uploaded-image-section">
            <h3>Uploaded Image</h3>
            <div className="image-preview">
              <img 
                src={uploadImageUrl} 
                alt="Uploaded"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;