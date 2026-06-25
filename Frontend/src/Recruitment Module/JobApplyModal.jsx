import { useState, useRef } from "react";
import "./JobDetail.css";
import API from "../api.js";

const INITIAL = { firstName: "", lastName: "", email: "", phone: "", resume: null };

export default function JobApplyModal({ job, onClose, applyEndpoint = "/recruitment/applications" }) {
    const [form, setForm] = useState(INITIAL);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState("idle"); // idle | loading | success | error
    const fileRef = useRef();

    const validate = () => {
        const e = {};
        if (!form.firstName.trim())   e.firstName = "First name is required.";
        if (!form.lastName.trim())    e.lastName  = "Last name is required.";
        if (!form.email.trim())       e.email     = "Email is required.";
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
        if (!form.phone.trim())       e.phone     = "Phone number is required.";
        else if (!/^\+?[\d\s\-()]{7,15}$/.test(form.phone)) e.phone = "Enter a valid phone number.";
        if (!form.resume)             e.resume    = "Please upload your resume.";
        return e;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
        if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
    };

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const allowed = ["application/pdf", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
        if (!allowed.includes(file.type)) {
            setErrors((er) => ({ ...er, resume: "Only PDF or Word files accepted." }));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setErrors((er) => ({ ...er, resume: "File must be under 5 MB." }));
            return;
        }
        setForm((f) => ({ ...f, resume: file }));
        setErrors((er) => ({ ...er, resume: undefined }));
    };

    const handleSubmit = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }

        setStatus("loading");
        try {
            const data = new FormData();
            data.append("jobId",     job._id);
            data.append("companyId", job.companyId);
            data.append("firstName", form.firstName);
            data.append("lastName",  form.lastName);
            data.append("email",     form.email);
            data.append("phone",     form.phone);
            data.append("resume",    form.resume);

            await API.post(applyEndpoint, data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setStatus("success");
        } catch (err) {
            console.error(err);
            setStatus("error");
        }
    };

    /* ── Success screen ── */
    if (status === "success") return (
        <div className="jam-overlay" onClick={onClose}>
            <div className="jam-drawer jam-drawer--success" onClick={(e) => e.stopPropagation()}>
                <div className="jam-success-wrap">
                    <div className="jam-success-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <h3 className="jam-success-title">Application Submitted!</h3>
                    <p className="jam-success-sub">
                        Thanks, <strong>{form.firstName}</strong>! We've received your application for <strong>{job.title}</strong> and will be in touch.
                    </p>
                    <button className="jam-close-success" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="jam-overlay" onClick={onClose}>
            <div className="jam-drawer" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="jam-header">
                    <div>
                        <h2 className="jam-title">Apply for Role</h2>
                        <p className="jam-subtitle">{job.title} · {job.departmentId?.deptName || ""}</p>
                    </div>
                    <button className="jam-x" onClick={onClose} aria-label="Close">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6"  y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                <div className="jam-body">
                    {/* Name row */}
                    <div className="jam-row-2">
                        <div className="jam-field">
                            <label className="jam-label">First Name <span>*</span></label>
                            <input
                                className={`jam-input ${errors.firstName ? "jam-input--err" : ""}`}
                                name="firstName"
                                placeholder="John"
                                value={form.firstName}
                                onChange={handleChange}
                            />
                            {errors.firstName && <p className="jam-err">{errors.firstName}</p>}
                        </div>
                        <div className="jam-field">
                            <label className="jam-label">Last Name <span>*</span></label>
                            <input
                                className={`jam-input ${errors.lastName ? "jam-input--err" : ""}`}
                                name="lastName"
                                placeholder="Doe"
                                value={form.lastName}
                                onChange={handleChange}
                            />
                            {errors.lastName && <p className="jam-err">{errors.lastName}</p>}
                        </div>
                    </div>

                    {/* Email */}
                    <div className="jam-field">
                        <label className="jam-label">Email Address <span>*</span></label>
                        <input
                            className={`jam-input ${errors.email ? "jam-input--err" : ""}`}
                            name="email"
                            type="email"
                            placeholder="john@example.com"
                            value={form.email}
                            onChange={handleChange}
                        />
                        {errors.email && <p className="jam-err">{errors.email}</p>}
                    </div>

                    {/* Phone */}
                    <div className="jam-field">
                        <label className="jam-label">Phone Number <span>*</span></label>
                        <input
                            className={`jam-input ${errors.phone ? "jam-input--err" : ""}`}
                            name="phone"
                            type="tel"
                            placeholder="+91 98765 43210"
                            value={form.phone}
                            onChange={handleChange}
                        />
                        {errors.phone && <p className="jam-err">{errors.phone}</p>}
                    </div>

                    {/* Resume upload */}
                    <div className="jam-field">
                        <label className="jam-label">Resume <span>*</span></label>
                        <div
                            className={`jam-upload-zone ${errors.resume ? "jam-upload-zone--err" : ""} ${form.resume ? "jam-upload-zone--filled" : ""}`}
                            onClick={() => fileRef.current?.click()}
                        >
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".pdf,.doc,.docx"
                                style={{ display: "none" }}
                                onChange={handleFile}
                            />
                            {form.resume ? (
                                <>
                                    <div className="jam-upload-file-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                            <polyline points="14 2 14 8 20 8"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="jam-upload-filename">{form.resume.name}</p>
                                        <p className="jam-upload-size">{(form.resume.size / 1024).toFixed(0)} KB · Click to change</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="jam-upload-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <polyline points="16 16 12 12 8 16"/>
                                            <line x1="12" y1="12" x2="12" y2="21"/>
                                            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                                        </svg>
                                    </div>
                                    <p className="jam-upload-cta">Click to upload your resume</p>
                                    <p className="jam-upload-hint">PDF or Word · Max 5 MB</p>
                                </>
                            )}
                        </div>
                        {errors.resume && <p className="jam-err">{errors.resume}</p>}
                    </div>

                    {status === "error" && (
                        <div className="jam-api-err">
                            Something went wrong. Please try again.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="jam-footer">
                    <button className="jam-cancel" onClick={onClose}>Cancel</button>
                    <button
                        className="jam-submit"
                        onClick={handleSubmit}
                        disabled={status === "loading"}
                    >
                        {status === "loading" ? (
                            <span className="jam-spinner" />
                        ) : (
                            <>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="22" y1="2" x2="11" y2="13"/>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                </svg>
                                Submit Application
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}