import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRole }) {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) return <Navigate to="/" replace />;

    // Optional: block wrong roles (e.g. company user hitting /admin/dashboard)
    if (allowedRole && role !== allowedRole) return <Navigate to="/" replace />;

    return children;
}

export default ProtectedRoute;