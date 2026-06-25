import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import EmployeeForm from "./Employee Module/EmployeeForm";
import EmployeeList from "./Employee Module/EmployeeList";
import Login from "./Login";
import Home from "./Dashboard/Home";
import Topbar from "./Topbar";
import Sidebar from "./Sidebar";
import Attendance from "./Attendance Module/Attendance";
import Tax from "./Payroll Module/Tax";
import Payroll from "./Payroll Module/Payroll";
import EmployeeTaxSetup from "./Payroll Module/EmployeeTaxSetup";
import AdminSidebar from "./Admin Module/AdminSidebar";
import AdminDashboard from "./Admin Module/AdminDashboard";
import Companies from "./Admin Module/Companies";
import ProtectedRoute from "./ProtectedRoutes";
import Department from "./Deparmtents Module/Department";
import "./App.css";
import JobListings from "./Recruitment Module/JobListings";
import JobForm from "./Recruitment Module/JobForm";
import JobDetail from "./Recruitment Module/JobDetail";
import JobApplication from "./Recruitment Module/JobApplications";
import PublicJobListings from "./Recruitment Module/Public Pages/PublicJobListings";
import PublicJobDetail from "./Recruitment Module/Public Pages/PublicJobDetail";
import SalaryStructure from "./Employee Module/SalaryStructure";

function AppLayout() {
    return (
        <div className="app-layout">
            <Topbar />
            <div className="app-body">
                <Sidebar />
                <main className="app-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

function AdminLayout() {
    return (
        <div className="app-layout">
            <Topbar />
            <div className="app-body">
                <AdminSidebar />
                <main className="app-main">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<Login />} />
                <Route path="/admin/login" element={<Login />} />

                {/* Admin routes */}
                <Route element={
                    <ProtectedRoute allowedRole="admin">
                        <AdminLayout />
                    </ProtectedRoute>
                }>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/companies" element={<Companies />} />
                </Route>

                {/* Company routes */}
                <Route element={
                    <ProtectedRoute allowedRole="company">
                        <AppLayout />
                    </ProtectedRoute>
                }>
                    <Route path="/home" element={<Home />} />
                    <Route path="/add-employee" element={<EmployeeForm />} />
                    <Route path="/employees" element={<EmployeeList />} />
                    <Route path="/departments" element={<Department />} />
                    <Route path="/attendance" element={<Attendance />} />
                    <Route path="/tax" element={<Tax />} />
                    <Route path="/payroll" element={<Payroll />} />
                    <Route path="/employee-tax-setup" element={<EmployeeTaxSetup />} />
                    <Route path="/salary/:employeeId" element={<SalaryStructure />} />
                    
                    {/* ── Job Listings ── */}
                    <Route path="/job-listings" element={<JobListings />} />
                    <Route path="/job-listings/new" element={<JobForm />} />
                    <Route path="/job-listings/edit" element={<JobForm />} />
                    <Route path="/job-listings/:id" element={<JobDetail />} />

                    <Route path="/job-applications" element={<JobApplication />} />
                </Route>
                <Route path="/careers/:companyId" element={<PublicJobListings />} />
                <Route path="/careers/:companyId/:jobId" element={<PublicJobDetail />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;