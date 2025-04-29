import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import '../styles/UserDashboard.css';

function UserDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem('ACCESS_TOKEN');
    localStorage.removeItem('REFRESH_TOKEN');
    navigate('/login');
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('api/documents/', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
        },
      });
      
      // Format documents - prioritize filename field
      const formattedDocuments = response.data.map(doc => ({
        id: doc.id,
        name: doc.filename || doc.file_name || doc.title || doc.image_name || `Document ${doc.id}`,
        date: doc.uploaded_at || doc.created_at || doc.upload_date,
        status: doc.processing_status || "Processed",
        url: doc.imageUrl || doc.image
      }));
      
      setDocuments(formattedDocuments);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      // Check if error is due to authentication
      if (error.response && error.response.status === 401) {
        setError('Your session has expired. Please log in again.');
        setTimeout(() => {
          handleLogout();
        }, 2000);
      } else {
        setError('Failed to load your documents. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Handle viewing a document - using the correct URL format
  const handleViewDocument = (document) => {
    navigate(`/document-view/${document.id}`, {
      state: {
        fileName: document.name,
        image_url: document.url,
        processingStatus: document.status
      }
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Date unavailable";
      }
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch (error) {
      return "Date unavailable";
    }
  };

  // Get status class for styling
  const getStatusClass = (status) => {
    const statusLower = (status || "").toLowerCase();
    if (statusLower === "processed") return "status-processed";
    if (statusLower === "processing") return "status-processing";
    if (statusLower === "error") return "status-error";
    return "status-pending";
  };

  // Handle document deletion
  const handleDeleteDocument = async (documentId) => {
    try {
      await api.delete(`api/documents/${documentId}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ACCESS_TOKEN')}`,
        },
      });
      
      // Refresh the documents list
      fetchDocuments();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete document:", error);
      setError('Failed to delete document. Please try again.');
    }
  };

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
      
      <div className="dashboard-container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading your documents...</p>
          </div>
        ) : (
          <div className="documents-container">
            <h2>My Documents</h2>

            {documents.length === 0 ? (
              <div className="empty-state">
                <p>You haven't uploaded any documents yet.</p>
                <button className="btn btn-primary" onClick={() => navigate("/upload")}>
                  Upload a Document
                </button>
              </div>
            ) : (
              <>
                <div className="documents-header">
                  <span className="doc-name">Document Name</span>
                  <span className="doc-date">Date Uploaded</span>
                  <span className="doc-status">Status</span>
                  <span className="doc-actions">Actions</span>
                </div>

                <div className="documents-list">
                  {documents.map((doc) => (
                    <div key={doc.id} className="document-item">
                      <span className="doc-name">{doc.name}</span>
                      <span className="doc-date">{formatDate(doc.date)}</span>
                      <span className={`doc-status ${getStatusClass(doc.status)}`}>
                        {doc.status}
                      </span>
                      <span className="doc-actions">
                        <button 
                          className="btn btn-small btn-primary" 
                          onClick={() => handleViewDocument(doc)}
                        >
                          View
                        </button>
                        {deleteConfirm === doc.id ? (
                          <div className="delete-confirmation">
                            <span>Are you sure?</span>
                            <button 
                              className="btn btn-small btn-danger" 
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              Yes
                            </button>
                            <button 
                              className="btn btn-small btn-secondary" 
                              onClick={() => setDeleteConfirm(null)}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="btn btn-small btn-danger" 
                            onClick={() => setDeleteConfirm(doc.id)}
                          >
                            Delete
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;