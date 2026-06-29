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

});

export default mongoose.model("Attendance", attendanceSchema);