import { NavLink } from "react-router-dom";
import "../Sidebar.css";

function AdminSidebar() {
    const adminName = "Admin";

    return (
        <aside className="sidebar">

            {/* Branding */}
            <div className="sidebar-brand">
                <p className="sidebar-title">Admin Portal</p>
                <p className="brand-subtitle">Platform Management</p>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav">
                <p className="nav-label">Menu</p>

                <NavLink
                    to="/admin/dashboard"
                    className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                >
                    Dashboard
                </NavLink>

                <NavLink
                    to="/admin/companies"
                    className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                >
                    Companies
                </NavLink>
            </nav>

            {/* Bottom */}
            <div className="sidebar-bottom">
                <div className="user-profile">
                    <div className="user-avatar">A</div>
                    <div className="user-info">
                        <span className="user-name">{adminName}</span>
                        <span className="user-role">Super Admin</span>
                    </div>
                </div>
            </div>

        </aside>
    );
}

export default AdminSidebar;