import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },
    
    date: {
        type: Date,
        required: true
    },

    inTime: String,
    breakIn: String,
    breakOut: String,
    outTime: String,

    status: {
        type: String,
        enum: [
            "Present",
            "Paid Leave",
            "Non-Paid Leave",
            "Holiday",
            "Week Off",
        ],
        default: "Present"
    },

    isHalfDay: {
        type: Boolean,
        default: false
    }

});

export default mongoose.model("Attendance", attendanceSchema);