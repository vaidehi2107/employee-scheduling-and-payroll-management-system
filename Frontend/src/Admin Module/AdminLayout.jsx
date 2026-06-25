import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import Topbar from "../Topbar";

function AdminLayout() {
    return (
        <div className="layout">
            <AdminSidebar />
            <div className="main-content">
                <Topbar />
                <Outlet />
            </div>
        </div>
    );
}

export default AdminLayout;