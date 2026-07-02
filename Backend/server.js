import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import employeeRoutes from "./routes/employeeRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import taxRoutes from "./routes/taxRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import employeeTaxRoutes from "./routes/employeeTaxRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import jobDescriptionRoutes from "./routes/jobDescriptionRoutes.js";
import jobApplicationRoutes from "./routes/jobApplicationRoutes.js";
import publicRecruitmentRoutes from "./routes/publicRecruitmentRoutes.js";
import salaryRoutes from "./routes/salaryRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js"; 

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

app.use("/api", employeeRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", taxRoutes);
app.use("/api", payrollRoutes);
app.use("/api", employeeTaxRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", authRoutes);
app.use("/api", departmentRoutes);
app.use("/api", jobDescriptionRoutes);
app.use("/api", jobApplicationRoutes);
app.use("/api/public", publicRecruitmentRoutes);
app.use("/api", salaryRoutes);
app.use("/api/leaves", leaveRoutes);

app.get("/", (req,res)=> {
    res.send("Hello World!");
});

const connectDB = async() => {
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("connected to DB!");
    } catch(err) {
        console.log("Failed to Connect to DB!",err);
    }  
}

app.listen(PORT, ()=> {
    console.log(`App is listening on port ${PORT}`);
    connectDB();
});

