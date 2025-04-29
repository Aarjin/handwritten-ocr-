import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import '../styles/Form.css';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    const validateForm = () => {
        const newErrors = {};
        
        if (!username) newErrors.username = "Username is required";
        if (!password) newErrors.password = "Password is required";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setLoading(true);

        try {
            const res = await api.post('api/token/', { username, password });
            localStorage.setItem(ACCESS_TOKEN, res.data.access);
            localStorage.setItem(REFRESH_TOKEN, res.data.refresh);

            navigate('/upload');
        } catch (error) {
            // Handle different types of errors
            if (error.response) {
                // The server responded with a status code outside of 2xx range
                if (error.response.data.error) {
                    // Our custom error format
                    setErrors({ general: error.response.data.error });
                } else if (error.response.data.detail) {
                    // DRF's default error format
                    setErrors({ general: error.response.data.detail });
                } else {
                    // Handle structured field errors
                    const backendErrors = {};
                    for (const [key, value] of Object.entries(error.response.data)) {
                        backendErrors[key] = Array.isArray(value) ? value[0] : value;
                    }
                    
                    if (Object.keys(backendErrors).length > 0) {
                        setErrors(backendErrors);
                    } else {
                        setErrors({ general: "Invalid username or password" });
                    }
                }
            } else {
                // Network error or something else
                setErrors({ general: "Error connecting to server" });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="form-container">
            <h1>Login</h1>
            
            {errors.general && (
                <div className="general-error">{errors.general}</div>
            )}
            
            <div className="input-group">
                <input
                    className={`form-input ${errors.username ? 'input-error' : ''}`}
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                />
                {errors.username && <div className="error-message">{errors.username}</div>}
            </div>
            
            <div className="input-group">
                <input
                    className={`form-input ${errors.password ? 'input-error' : ''}`}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                />
                {errors.password && <div className="error-message">{errors.password}</div>}
            </div>
            
            <button className="form-button" type="submit" disabled={loading}>
                {loading ? "Loading..." : "Login"}
            </button>
            <p className="form-link">
                Don't have an account? <Link to="/register">Sign up</Link>
            </p>
        </form>
    );
}

export default Login;