import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const loginResponse = await login(email, password);
      // Use role directly from backend response - do NOT wait for AuthContext reload
      const userRole = loginResponse?.user?.role || loginResponse?.data?.user?.role;
      
      if (userRole === "admin" || userRole === "superadmin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/student/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check credentials.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col bg-gray-900 p-8 rounded-2xl w-full max-w-md shadow-lg space-y-4"
      >
        <h1 className="text-3xl font-bold text-center mb-4 text-green-400">
          Login
        </h1>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 rounded bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-3 rounded bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
          required
        />

        <button
          type="submit"
          className="mt-4 bg-green-500 hover:bg-green-600 text-white py-2 rounded font-semibold transition duration-300"
        >
          Log In
        </button>

        <div className="mt-3 w-full text-center">
          <Link 
            to="/register"
            className="text-gray-400 hover:text-white text-sm hover:underline"
          >
            New here? Register Now
          </Link>
        </div>
      </form>
    </div>
  );
}
