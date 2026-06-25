import { useEffect, useState } from "react";
import "./JobForm.css";
import API from "../api.js";
import { useNavigate, useLocation } from "react-router-dom";

const EMPTY_FORM = {
    title: "",
    departmentId: "",
    location: "",
    employmentType: "",
    experienceRequired: "",
    salaryRange: "",
    description: "",
    responsibilities: [""],
    requirements: [""],
    skills: [""],
    status: "Active",
};

function JobForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const editJob = location.state?.job || null;
    const isEdit = !!editJob;

    const [form, setForm] = useState(EMPTY_FORM);
    const [departments, setDepartments] = useState([]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Prefill on edit
    useEffect(() => {
        if (editJob) {
            setForm({
                title: editJob.title || "",
                departmentId: editJob.departmentId?._id || editJob.departmentId || "",
                location: editJob.location || "",
                employmentType: editJob.employmentType || "",
                experienceRequired: editJob.experienceRequired || "",
                salaryRange: editJob.salaryRange || "",
                description: editJob.description || "",
                responsibilities: editJob.responsibilities?.length ? editJob.responsibilities : [""],
                requirements: editJob.requirements?.length ? editJob.requirements : [""],
                skills: editJob.skills?.length ? editJob.skills : [""],
                status: editJob.status || "Active",
            });
        }
    }, []);

    // Fetch departments
    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const res = await API.get("/departments");
                setDepartments(res.data);
            } catch (err) {
                console.error(err);
            }
        };
        fetchDepts();
    }, []);

    const set = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => ({ ...prev, [field]: "" }));
    };

    // Dynamic list helpers
    const listSet = (field, index, value) => {
        const arr = [...form[field]];
        arr[index] = value;
        setForm((prev) => ({ ...prev, [field]: arr }));
    };
    const listAdd = (field) => {
        setForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
    };
    const listRemove = (field, index) => {
        const arr = form[field].filter((_, i) => i !== index);
        setForm((prev) => ({ ...prev, [field]: arr.length ? arr : [""] }));
    };

    const validate = () => {
        const e = {};
        if (!form.title.trim())         e.title = "Job title is required.";
        if (!form.departmentId)         e.departmentId = "Please select a department.";
        if (!form.location.trim())      e.location = "Location is required.";
        if (!form.employmentType)       e.employmentType = "Please select employment type.";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                ...form,
                responsibilities: form.responsibilities.filter(Boolean),
                requirements:     form.requirements.filter(Boolean),
                skills:           form.skills.filter(Boolean),
            };
            if (isEdit) {
                await API.put(`/recruitment/jobs/${editJob._id}`, payload);
            } else {
                await API.post("/recruitment/jobs", payload);
            }
            navigate("/job-listings", {
                state: { toast: { message: isEdit ? "Job updated successfully." : "Job posted successfully.", type: "success" } },
            });
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Internship", "Contract", "Remote"];

    return (
        <div className="jf-page">
            {/* Back + Header */}
            <div className="jf-header">
                <button className="jf-back-btn" onClick={() => navigate("/job-listings")}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    Back to Listings
                </button>
                <div>
                    <h2 className="jf-title">{isEdit ? "Edit Job Listing" : "Post a New Job"}</h2>
                    <p className="jf-subtitle">{isEdit ? "Update the details of this role" : "Fill in the details to create a new listing"}</p>
                </div>
            </div>

            <div className="jf-body">
                {/* ── Section: Basic Info ── */}
                <div className="jf-card">
                    <h3 className="jf-section-title">Basic Information</h3>
                    <div className="jf-grid-2">
                        <div className="jf-field">
                            <label className="jf-label">Job Title <span className="jf-req">*</span></label>
                            <input
                                className={`jf-input ${errors.title ? "jf-input-error" : ""}`}
                                value={form.title}
                                onChange={(e) => set("title", e.target.value)}
                                placeholder="e.g. Senior Frontend Developer"
                            />
                            {errors.title && <span className="jf-error">{errors.title}</span>}
                        </div>

                        <div className="jf-field">
                            <label className="jf-label">Department <span className="jf-req">*</span></label>
                            <select
                                className={`jf-input ${errors.departmentId ? "jf-input-error" : ""}`}
                                value={form.departmentId}
                                onChange={(e) => set("departmentId", e.target.value)}
                            >
                                <option value="">Select department</option>
                                {departments.map((d) => (
                                    <option key={d._id} value={d._id}>{d.deptName}</option>
                                ))}
                            </select>
                            {errors.departmentId && <span className="jf-error">{errors.departmentId}</span>}
                        </div>

                        <div className="jf-field">
                            <label className="jf-label">Location <span className="jf-req">*</span></label>
                            <input
                                className={`jf-input ${errors.location ? "jf-input-error" : ""}`}
                                value={form.location}
                                onChange={(e) => set("location", e.target.value)}
                                placeholder="e.g. New York, NY"
                            />
                            {errors.location && <span className="jf-error">{errors.location}</span>}
                        </div>

                        <div className="jf-field">
                            <label className="jf-label">Employment Type <span className="jf-req">*</span></label>
                            <select
                                className={`jf-input ${errors.employmentType ? "jf-input-error" : ""}`}
                                value={form.employmentType}
                                onChange={(e) => set("employmentType", e.target.value)}
                            >
                                <option value="">Select type</option>
                                {EMPLOYMENT_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            {errors.employmentType && <span className="jf-error">{errors.employmentType}</span>}
                        </div>

                        <div className="jf-field">
                            <label className="jf-label">Experience Required</label>
                            <input
                                className="jf-input"
                                value={form.experienceRequired}
                                onChange={(e) => set("experienceRequired", e.target.value)}
                                placeholder="e.g. 3–5 years"
                            />
                        </div>

                        <div className="jf-field">
                            <label className="jf-label">Salary Range</label>
                            <input
                                className="jf-input"
                                value={form.salaryRange}
                                onChange={(e) => set("salaryRange", e.target.value)}
                                placeholder="e.g. $80,000 – $100,000"
                            />
                        </div>

                        <div className="jf-field">
                            <label className="jf-label">Status</label>
                            <select
                                className="jf-input"
                                value={form.status}
                                onChange={(e) => set("status", e.target.value)}
                            >
                                <option value="Active">Active</option>
                                <option value="CLosed">Closed</option>
                            </select>
                        </div>
                    </div>

                    <div className="jf-field jf-field-full">
                        <label className="jf-label">Job Description</label>
                        <textarea
                            className="jf-textarea"
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                            placeholder="Describe the role, team, and what success looks like…"
                            rows={4}
                        />
                    </div>
                </div>

                {/* ── Section: Responsibilities ── */}
                <div className="jf-card">
                    <h3 className="jf-section-title">Responsibilities</h3>
                    {form.responsibilities.map((item, i) => (
                        <div className="jf-list-row" key={i}>
                            <input
                                className="jf-input"
                                value={item}
                                onChange={(e) => listSet("responsibilities", i, e.target.value)}
                                placeholder={`Responsibility ${i + 1}`}
                            />
                            <button className="jf-list-remove" onClick={() => listRemove("responsibilities", i)} title="Remove">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    ))}
                    <button className="jf-list-add" onClick={() => listAdd("responsibilities")}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add Responsibility
                    </button>
                </div>

                {/* ── Section: Requirements ── */}
                <div className="jf-card">
                    <h3 className="jf-section-title">Requirements</h3>
                    {form.requirements.map((item, i) => (
                        <div className="jf-list-row" key={i}>
                            <input
                                className="jf-input"
                                value={item}
                                onChange={(e) => listSet("requirements", i, e.target.value)}
                                placeholder={`Requirement ${i + 1}`}
                            />
                            <button className="jf-list-remove" onClick={() => listRemove("requirements", i)} title="Remove">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    ))}
                    <button className="jf-list-add" onClick={() => listAdd("requirements")}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add Requirement
                    </button>
                </div>

                {/* ── Section: Skills ── */}
                <div className="jf-card">
                    <h3 className="jf-section-title">Skills</h3>
                    <div className="jf-skills-grid">
                        {form.skills.map((item, i) => (
                            <div className="jf-skill-row" key={i}>
                                <input
                                    className="jf-input"
                                    value={item}
                                    onChange={(e) => listSet("skills", i, e.target.value)}
                                    placeholder={`Skill ${i + 1}`}
                                />
                                <button className="jf-list-remove" onClick={() => listRemove("skills", i)} title="Remove">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                    <button className="jf-list-add" onClick={() => listAdd("skills")}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add Skill
                    </button>
                </div>

                {/* ── Submit row ── */}
                <div className="jf-submit-row">
                    <button className="jf-cancel-btn" onClick={() => navigate("/job-listings")}>Cancel</button>
                    <button className="jf-submit-btn" onClick={handleSubmit} disabled={saving}>
                        {saving ? "Saving…" : isEdit ? "Save Changes" : "Post Job"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default JobForm;