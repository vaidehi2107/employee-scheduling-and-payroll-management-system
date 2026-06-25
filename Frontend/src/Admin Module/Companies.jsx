import { useState, useEffect } from "react";
import axios from "axios";
import "./Companies.css";
import { useNavigate, useLocation } from "react-router-dom";

const API = "http://localhost:5000/api/admin";

function getInitials(name = "") {
    return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

const AVATAR_COLORS = [
    { bg: "#e6f1fb", color: "#185fa5" },
    { bg: "#e1f5ee", color: "#0f6e56" },
    { bg: "#faeeda", color: "#854f0b" },
    { bg: "#eeedfe", color: "#534ab7" },
    { bg: "#fbeaf0", color: "#993556" },
];

function avatarColor(name = "") {
    return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const EMPTY_FORM = {
    companyName: "", username: "", password: "", email: "", contactPerson: "", phone: "",
};

export default function Companies() {
    const [companies, setCompanies]       = useState([]);
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showModal, setShowModal]       = useState(false);
    const [editTarget, setEditTarget]     = useState(null);
    const [form, setForm]                 = useState(EMPTY_FORM);
    const [formError, setFormError]       = useState("");
    const [saving, setSaving]             = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [toast, setToast] = useState(null);

     const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2000);
    };

    useEffect(() => {
         console.log("Location State:", location.state);
        if (location.state?.toast) {
            showToast(
                location.state.toast.message,
                location.state.toast.type
            );

            navigate(location.pathname, {
                replace: true,
                state: null
            });
        }
    }, [location, navigate]);

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => { fetchCompanies(); }, []);

    async function fetchCompanies() {
        try {
            setLoading(true);
            const res = await axios.get(`${API}/company/all`, { headers });
            setCompanies(res.data);
        } catch (err) {
            showToast(err.response?.data?.message || "Failed to load companies", "error");
        } finally {
            setLoading(false);
        }
    }


    const filtered = companies.filter((c) => {
        const q = search.toLowerCase();
        const matchesSearch =
            c.companyName?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.username?.toLowerCase().includes(q);
        const matchesStatus =
            statusFilter === "all" ? true :
            statusFilter === "active" ? c.isActive : !c.isActive;
        return matchesSearch && matchesStatus;
    });

    function openAdd() {
        setEditTarget(null); setForm(EMPTY_FORM); setFormError(""); setShowModal(true);
    }
    function openEdit(company) {
        setEditTarget(company);
        setForm({ companyName: company.companyName || "", username: company.username || "",
            password: "", email: company.email || "", contactPerson: company.contactPerson || "",
            phone: company.phone || "", isActive: company.isActive ?? true });
        setFormError(""); setShowModal(true);
    }
    function closeModal() {
        setShowModal(false); setEditTarget(null); setForm(EMPTY_FORM); setFormError("");
    }
    function handleFormChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

    async function handleSave() {
        setFormError("");
        if (!form.companyName.trim()) return setFormError("Company name is required.");
        if (!editTarget && !form.username.trim()) return setFormError("Username is required.");
        if (!editTarget && !form.password.trim()) return setFormError("Password is required.");
        setSaving(true);
        try {
            if (editTarget) {
                const payload = { companyName: form.companyName, email: form.email,
                    contactPerson: form.contactPerson, phone: form.phone, isActive: form.isActive };
                const res = await axios.put(`${API}/update/company/${editTarget._id}`, payload, { headers });
                setCompanies((prev) => prev.map((c) => (c._id === editTarget._id ? res.data : c)));
                showToast("Company updated.");
            } else {
                const res = await axios.post(`${API}/company`, form, { headers });
                setCompanies((prev) => [...prev, res.data]);
                showToast("Company added.");
            }
            closeModal();
        } catch (err) {
            setFormError(err.response?.data?.message || "Something went wrong.");
        } finally {
            setSaving(false);
        }
    }

    async function handleToggleStatus(company) {
        try {
            const res = await axios.put(`${API}/update/company/${company._id}`,
                { isActive: !company.isActive }, { headers });
            setCompanies((prev) => prev.map((c) => (c._id === company._id ? res.data : c)));
            showToast(res.data.isActive ? "Company activated." : "Company deactivated.");
        } catch (err) {
            showToast(err.response?.data?.message || "Status update failed.", "error");
        }
    }

    async function handleDelete(id) {
        try {
            await axios.delete(`${API}/delete/company/${id}`, { headers });
            setCompanies((prev) => prev.filter((c) => c._id !== id));
            showToast("Employee deleted Successfully.", "delete");
        } catch (err) {
            showToast(err.response?.data?.message || "Delete failed.", "error");
        } finally {
            setDeleteConfirm(null);
        }
    }

    return (
        <>
        
        <div className="companies-page">

            {/* Header */}
            <div className="companies-header">
                <div>
                    <h1 className="companies-title">Companies</h1>
                    <p className="companies-sub">Manage registered companies and their access</p>
                </div>
                <button className="btn-primary" onClick={openAdd}>+ Add company</button>
            </div>

            {/* Section card — filters + table */}
            <div className="companies-section">

                <div className="companies-filters">
                    <div className="search-wrap">
                        <span className="search-icon">&#128269;</span>
                        <input
                            type="text"
                            placeholder="Search by name, email or username…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select className="filter-select" value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                <div className="table-wrap">
                    {loading ? (
                        <div className="table-empty">Loading…</div>
                    ) : filtered.length === 0 ? (
                        <div className="table-empty">No companies found.</div>
                    ) : (
                        <table className="companies-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: "center" }}>Company</th>
                                    <th style={{ textAlign: "center" }}>Contact Person</th>
                                    <th style={{ textAlign: "center" }}>Phone</th>
                                    <th style={{ textAlign: "center" }}>Username</th>
                                    <th style={{ textAlign: "center" }}>Status</th>
                                    <th style={{ textAlign: "center" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((company) => {
                                    const initials = getInitials(company.companyName);
                                    const av = avatarColor(company.companyName);
                                    return (
                                        <tr key={company._id}>
                                            <td style={{ textAlign: "center" }}>
                                                <div className="cell-company" style={{ justifyContent: "center" }}>
                                                    <div className="avatar" style={{ background: av.bg, color: av.color }}>
                                                        {initials}
                                                    </div>
                                                    <div className="company-name">{company.companyName}</div>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: "center" }}>{company.contactPerson || "—"}</td>
                                            <td style={{ textAlign: "center" }}>{company.phone || "—"}</td>
                                            <td className="mono" style={{ textAlign: "center" }}>{company.username}</td>
                                            <td style={{ textAlign: "center" }}>
                                                <span className={`badge ${company.isActive ? "badge-active" : "badge-inactive"}`}>
                                                    <span className="badge-dot" />
                                                    {company.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: "center" }}>
                                                <div className="actions" style={{ justifyContent: "center" }}>
                                                    <button className="icon-btn" title="Edit" onClick={() => openEdit(company)}>
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                        </svg>
                                                    </button>
                                                    <button className="icon-btn icon-btn-danger" title="Delete"
                                                        onClick={() => setDeleteConfirm(company._id)}>
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"/>
                                                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                                            <path d="M10 11v6M14 11v6"/>
                                                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>{/* end companies-section */}

            {/* Modal — Add / Edit */}
            {showModal && (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editTarget ? "Edit company" : "Add company"}</h2>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Company name *</label>
                                <input name="companyName" value={form.companyName}
                                    onChange={handleFormChange} placeholder="Acme Pvt Ltd" />
                            </div>
                            {!editTarget && (
                                <>
                                    <div className="form-group">
                                        <label>Username *</label>
                                        <input name="username" value={form.username}
                                            onChange={handleFormChange} placeholder="acme_admin" autoComplete="off" />
                                    </div>
                                    <div className="form-group">
                                        <label>Password *</label>
                                        <input type="password" name="password" value={form.password}
                                            onChange={handleFormChange} placeholder="••••••••" autoComplete="new-password" />
                                    </div>
                                </>
                            )}
                            <div className="form-group">
                                <label>Email</label>
                                <input name="email" value={form.email}
                                    onChange={handleFormChange} placeholder="admin@acme.com" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Contact person</label>
                                    <input name="contactPerson" value={form.contactPerson}
                                        onChange={handleFormChange} placeholder="Ravi Shah" />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input name="phone" value={form.phone}
                                        onChange={handleFormChange} placeholder="+91 98765 43210" />
                                </div>
                            </div>
                            {editTarget && (
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        name="isActive"
                                        value={form.isActive ? "active" : "inactive"}
                                        onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}
                                        className="filter-select"
                                        style={{ width: "100%", padding: "11px 14px", paddingRight: "32px", color: "#1a1a2e" }}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            )}
                            {formError && <p className="form-error">{formError}</p>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeModal}>Cancel</button>
                            <button className="btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? "Saving…" : editTarget ? "Save changes" : "Add company"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Delete confirmation */}
        {deleteConfirm && (
            <div className="confirm-overlay">
                <div className="confirm-dialog">
                    <h4>Delete Company?</h4>
                    <p>This action cannot be undone.</p>
                    <div className="confirm-actions">
                        <button className="btn-confirm-delete" onClick={() => handleDelete(deleteConfirm)}>
                            Delete
                        </button>
                        <button className="btn-confirm-cancel" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )}

        {toast && (
                <div className={`toast toast-${toast.type}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {toast.type === "delete"
                    ? <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>
                    : <><polyline points="20 6 9 17 4 12"/></>
                    }
                </svg>
                {toast.message}
                </div>
            )}
        </>
    );
}