import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";
import '../styles/Form.css';

function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
  
    // Validation functions
    const validateUsername = (username) => {
        if (!username) return "Username is required";
        if (username.length < 4) return "Username must be at least 4 characters";
        if (!/^[a-zA-Z0-9_]+$/.test(username)) return "Username can only contain letters, numbers, and underscores";
        return "";
    };
    
    const validateEmail = (email) => {
        if (!email) return "Email is required";
        if (!/\S+@\S+\.\S+/.test(email)) return "Email address is invalid";
        return "";
    };
    
    const validatePassword = (password) => {
        if (!password) return "Password is required";
        if (password.length < 8) return "Password must be at least 8 characters";
        if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
        if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
        if (!/[0-9]/.test(password)) return "Password must contain at least one number";
        return "";
    };
    
    const validateForm = () => {
        const newErrors = {
            username: validateUsername(username),
            email: validateEmail(email),
            password: validatePassword(password),
            confirmPassword: password !== confirmPassword ? "Passwords do not match" : ""
        };
        
        setErrors(newErrors);
        
        // Return true if there are no errors (all error messages are empty)
        return !Object.values(newErrors).some(error => error);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate form before submission
        if (!validateForm()) {
            return;
        }
        
        setLoading(true);

        try {
            await api.post('api/user/register/', { username, email, password });
            navigate('/login');
        } catch (error) {
            // Handle API validation errors from backend
            if (error.response && error.response.data) {
                // Map backend errors to form fields
                const backendErrors = {};
                
                for (const [key, value] of Object.entries(error.response.data)) {
                    backendErrors[key] = Array.isArray(value) ? value[0] : value;
                }
                
                setErrors({...errors, ...backendErrors});
            } else {
                alert("Error during registration: " + (error.message || "Unknown error"));
            }
        } finally {
            setLoading(false);
        }
    };

    return(
        <form onSubmit={handleSubmit} className="form-container">
            <h1>Register</h1>
            
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
                    className={`form-input ${errors.email ? 'input-error' : ''}`}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                />
                {errors.email && <div className="error-message">{errors.email}</div>}
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
            
            <div className="input-group">
                <input
                    className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                />
                {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
            </div>
            
            <button className="form-button" type="submit" disabled={loading}>
                {loading ? "Loading..." : "Register"}
            </button>
            <p className="form-link">
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </form>
    );
}

export default Register;