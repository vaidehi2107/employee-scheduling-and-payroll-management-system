import { Link, useNavigate } from "react-router-dom";
import API from "./api.js";
import "./Topbar.css";

function Topbar() {
     const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await API.post("/logout");
        } catch (err) {
            console.error("Logout error", err);
        } finally {
            // Always clear storage regardless of API result
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            localStorage.removeItem("companyId");
            localStorage.removeItem("companyName");
            navigate("/", { replace: true }); // replace: true prevents back-button bypass
        }
    };

    return (
        <div className="topbar">
            {/* Left: Brand title */}
            <Link to="/home" className="topbar-title">prismetric</Link>

            {/* Right: Icons */}
            <div className="topbar-right">

                {/* Bell / Notifications */}
                <button className="icon-btn" title="Notifications">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                </button>

                {/* Help / Info */}
                <button className="icon-btn" title="Help">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                </button>

                {/* Logout */}
                <button className="icon-btn" title="Logout" onClick={handleLogout}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                </button>

            </div>
        </div>
    );
}

export default Topbar;