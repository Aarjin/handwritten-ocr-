import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {api} from "../api";
import '../styles/Form.css';


function Register() {
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
  
    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        if (password !== confirmPassword) {
        alert("Passwords do not match!")
        setLoading(false)
        return
        }

        try {
        await api.post('api/user/register/', { username, email, password })
        navigate('/login')
        } catch (error) {
        alert("Error during registration: " + error.message)
        } finally {
        setLoading(false)
        }
    }

    return(
        <form onSubmit={handleSubmit} className="form-container">
            <h1>Register</h1>
            <input
                className="form-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
            />
            <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
            />
            <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
            />
            <input
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                required
            />
            <button className="form-button" type="submit" disabled={loading}>
                {loading ? "Loading..." : "Register"}
            </button>
            <p className="form-link">
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </form>
    )
}
export default Register
