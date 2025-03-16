import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {api} from "../api";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import '../styles/Form.css'

function Login (){
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()

        setLoading(true)

        try {
            const res = await api.post('api/token/', { username, password })
            localStorage.setItem(ACCESS_TOKEN, res.data.access)
            localStorage.setItem(REFRESH_TOKEN, res.data.refresh)

            navigate('/upload')
        } catch (error) {

            alert(`Error during login: ${error.response?.data?.detail ||'Invalid credentials'}`)
        } finally {
        setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="form-container">
        <h1>Login</h1>
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
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
        />
        <button className="form-button" type="submit" disabled={loading}>
            {loading ? "Loading..." : "Login"}
        </button>
        <p className="form-link">
            Don't have an account? <Link to="/register">Sign up</Link>
        </p>
        </form>
    )

}
export default Login