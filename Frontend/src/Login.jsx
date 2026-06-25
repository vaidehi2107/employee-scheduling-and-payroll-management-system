import { useState } from "react";
import API from "./api.js";
import "./Login.css";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState({ userName: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    // Try admin login first, fall back to company login
    let response;
    try {
      response = await API.post("/admin/login", {
        username: userData.userName,
        password: userData.password,
      });
    } catch {
      response = await API.post("/login", {
        username: userData.userName,
        password: userData.password,
      });
    }

    const { token, role, companyId, companyName } = response.data;
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    if (companyId) localStorage.setItem("companyId", companyId);
    if (companyName) localStorage.setItem("companyName", companyName);

    if (role === "admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/home");
    }
  } catch (err) {
    alert(err.response?.data?.message || "Login failed");
  }
};
  return (
    <div className="login-container">
      

      {/* Login card */}
      <div className="login-card">
        <h1 className="welcome-title">Welcome back</h1>
        <p className="welcome-sub">Please enter your details to sign in.</p>

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div className="field-group">
            <label className="field-label">USERNAME</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Enter your username"
                name="userName"
                value={userData.userName}
                onChange={handleChange}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="field-group">
            <div className="password-label-row">
              <label className="field-label">PASSWORD</label>
              <button type="button" className="forgot-link">Forgot password?</button>
            </div>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                name="password"
                value={userData.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label className="remember-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
            />
            <span className="checkmark"></span>
            <span className="remember-text">Remember for 30 days</span>
          </label>

          {/* Submit */}
          <button type="submit" className="login-btn">
            Login
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
          </button>
        </form>

        {/* <div className="divider"></div> */}

        {/* <p className="signup-row">
          Don't have an account?{" "}
          <button type="button" className="request-link">Request Access</button>
        </p> */}
      </div>
    </div>
  );
}

export default Login;