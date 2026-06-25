import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import "./Sidebar.css";

function Sidebar() {
    const companyName = localStorage.getItem("companyName") || "Company Portal";
    const location = useLocation();
    
    const isEmployeeActive =
        location.pathname === "/employees" || location.pathname === "/add-employee";

    // Payroll sub-routes
    const payrollRoutes = ["/payroll", "/employee-tax-setup", "/tax"];
    const isPayrollSectionActive = payrollRoutes.some((r) =>
        location.pathname.startsWith(r)
    );

    // Keep submenu open if a payroll route is active, else respect toggle
    const [payrollOpen, setPayrollOpen] = useState(isPayrollSectionActive);

    const togglePayroll = () => setPayrollOpen((prev) => !prev);



    //recruitment sub-routes
    const recruitmentRoutes = ["/job-listings", "/job-applications"];
    const isRecruitmentSectionActive = recruitmentRoutes.some((r) =>
        location.pathname.startsWith(r)
    );
    // Keep submenu open if a payroll route is active, else respect toggle
    const [recruitmentOpen, setRecruitmentOpen] = useState(isRecruitmentSectionActive);

    const toggleRecruitment = () => setRecruitmentOpen((prev) => !prev);


    return (
        <aside className="sidebar">

            {/* Branding */}
            <div className="sidebar-brand">
                <p className="sidebar-title">{companyName}</p>
                <p className="brand-subtitle">Enterprise Management</p>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav">
                <p className="nav-label">Menu</p>

                <NavLink
                    to="/home"
                    className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                >
                    Dashboard
                </NavLink>

                 <NavLink
                    to="/departments"
                    className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                >
                    Departments
                </NavLink>

                <NavLink
                    to="/employees"
                    className={isEmployeeActive ? "nav-item active" : "nav-item"}
                >
                    Employee
                </NavLink>

                {/* ── Recruitment (parent toggle) ── */}
                <button
                    className={`nav-item nav-item--parent ${isRecruitmentSectionActive ? "active" : ""}`}
                    onClick={toggleRecruitment}
                    aria-expanded={recruitmentOpen}
                >
                    <span>Recruitment</span>
                    <span className={`nav-arrow ${recruitmentOpen ? "nav-arrow--open" : ""}`}>
                        ▾
                    </span>
                </button>
                
                {recruitmentOpen && (
                    <div className="nav-submenu">
                        <NavLink
                            to="/job-listings"
                            className={({ isActive }) =>
                                isActive ? "nav-item nav-item--sub active" : "nav-item nav-item--sub"
                            }
                        >
                            Job Descriptions
                        </NavLink>

                        <NavLink
                            to="/job-applications"
                            className={({ isActive }) =>
                                isActive ? "nav-item nav-item--sub active" : "nav-item nav-item--sub"
                            }
                        >
                            Job Applications
                        </NavLink>

                    </div>
                )}

                <NavLink
                    to="/attendance"
                    className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                >
                    Attendance
                </NavLink>

                {/* ── Payroll (parent toggle) ── */}
                <button
                    className={`nav-item nav-item--parent ${isPayrollSectionActive ? "active" : ""}`}
                    onClick={togglePayroll}
                    aria-expanded={payrollOpen}
                >
                    <span>Payroll</span>
                    <span className={`nav-arrow ${payrollOpen ? "nav-arrow--open" : ""}`}>
                        ▾
                    </span>
                </button>

                {/* ── Submenu ── */}
                {payrollOpen && (
                    <div className="nav-submenu">
                        <NavLink
                            to="/payroll"
                            className={({ isActive }) =>
                                isActive ? "nav-item nav-item--sub active" : "nav-item nav-item--sub"
                            }
                        >
                            Run Payroll
                        </NavLink>

                        <NavLink
                            to="/employee-tax-setup"
                            className={({ isActive }) =>
                                isActive ? "nav-item nav-item--sub active" : "nav-item nav-item--sub"
                            }
                        >
                            Employee Tax Setup
                        </NavLink>

                        <NavLink
                            to="/tax"
                            className={({ isActive }) =>
                                isActive ? "nav-item nav-item--sub active" : "nav-item nav-item--sub"
                            }
                        >
                            Tax Module
                        </NavLink>
                    </div>
                )}

                


                <NavLink
                    to="/users"
                    className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                >
                    User Management
                </NavLink>
            </nav>

            {/* Bottom */}
            <div className="sidebar-bottom">
                <NavLink
                    to="/settings"
                    className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                >
                    Settings
                </NavLink>

                <div className="user-profile">
                    <div className="user-avatar">A</div>
                    <div className="user-info">
                        <span className="user-name">Admin User</span>
                        <span className="user-role">System Root</span>
                    </div>
                </div>
            </div>

        </aside>
    );
}

export default Sidebar;