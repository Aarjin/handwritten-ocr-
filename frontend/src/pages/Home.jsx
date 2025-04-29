import { Link } from "react-router-dom";
import "../styles/home.css";

function Home() {
  return (
    <div className="home">
      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="logo">DevnagariDigitizer</div>
          <nav className="nav">
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn-primary">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Transform handwritten text into digital content</h1>
            <p>
              A simple, powerful OCR solution that accurately converts your
              handwritten notes into editable text in seconds.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn-primary">
                Get Started
              </Link>
              <Link to="/login" className="btn-secondary">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature">
              <div className="feature-icon">📷</div>
              <h3>Easy Upload</h3>
              <p>
                Upload images or drag and drop files containing handwritten
                text.
              </p>
            </div>
            <div className="feature">
              <div className="feature-icon">🔍</div>
              <h3>Accurate Recognition</h3>
              <p>
                Advanced algorithms to accurately extract text from handwriting.
              </p>
            </div>
            <div className="feature">
              <div className="feature-icon">✏️</div>
              <h3>Edit & Export</h3>
              <p>Edit extracted text and export to various formats.</p>
            </div>
            <div className="feature">
              <div className="feature-icon">📚</div>
              <h3>Document Management</h3>
              <p>
                Organize and access all your processed documents in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Upload</h3>
                <p>Upload an image containing handwritten text.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Process</h3>
                <p>OCR engine extracts the text from your image.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Edit</h3>
                <p>Review and edit the extracted text as needed.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Export</h3>
                <p>Save, copy, or export the text for your use.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sign up prompt */}
      <section className="cta">
        <div className="container">
          <h2>Ready to get started?</h2>
          <p>
            Join thousands of users who are already saving time with our OCR
            technology.
          </p>
          <div className="cta-actions">
            <Link to="/register" className="btn-primary">
              Create Free Account
            </Link>
            <Link to="/login" className="btn-secondary">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">DevnagariDigitizer</div>
            <div className="footer-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </div>
          </div>
          <div className="copyright">
            &copy; {new Date().getFullYear()} DevnagariDigitizer. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
