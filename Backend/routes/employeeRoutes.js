import express from "express";
import Employee from "../models/employee.js";
import Attendance from "../models/attendance.js";
import Payroll from "../models/payroll.js";
import { verifyToken } from "../middleware.js";

const router = express.Router();

    //CREATE ROUTE
    router.post("/emp/create", verifyToken, async(req,res)=> {
        try{
            const employee = new Employee({... req.body, companyId: req.companyId });
            const response = await employee.save();
            res.send(response);
        }catch(err){
            console.log(err);
            res.status(500).json({error: "Failed to save in DB!"});
        }
    });

    //GET ROUTE
    router.get("/emp/all", verifyToken, async(req,res) => {
        try{
            const employees = await Employee.find({ companyId: req.companyId });
            res.json(employees);
        }catch(err) {
            res.status(500).json({error: "Failed to get Employee Info!"});
        }
    });

    //DELETE ROUTE
    router.delete("/emp/delete/:id", verifyToken, async(req,res) => {
        try{
            const { id } = req.params;
            const employee = await Employee.findOne({ _id: id, companyId: req.companyId });
            if(!employee) return res.status(404).json({ message: "Employee not found" });
            await Attendance.deleteMany({employeeId: id});
            await Payroll.deleteMany({employeeId: id});
            await Employee.findByIdAndDelete(id);
            res.json({message: "Employee deleted Successfully"});
        }catch(err){
            res.status(500).json("Failed to Delete Employee",err);
        }
    });

    //UPDATE ROUTE
    router.put("/emp/update/:id", verifyToken, async(req,res) => {
        try{
            const { id } = req.params;
            const updatedEmployee = await Employee.findOneAndUpdate({ 
                _id: req.params.id, companyId: req.companyId }, 
                req.body, 
                {new: true});
            if(!updatedEmployee) return res.status(404).json({ message: "Employee not found" });
            res.json(updatedEmployee);
        }catch(err){
            res.status(500).json("Failed to Update",err);
        }
    });


    //Add wage route
    // router.post("/emp/:id/wages", verifyToken, async (req,res) => {
    //     try {
    //         const { id } = req.params;
    //         const newWage = req.body;
    //         const employee = await Employee.findByIdAndUpdate(
    //             id,
    //             {
    //                 $push: {wages: newWage}
    //             },
    //             {new: true}
    //         );
    //         res.json(employee);
    //     } catch (err) {
    //         res.status(500).json({message: err.message});
    //     }
    // });

    //update wage
    // router.put("/emp/:id/wages/:wageId", verifyToken, async (req,res) => {
    //     try{
    //         const { id, wageId } = req.params;
    //         const updatedEmployee = await Employee.findOneAndUpdate(
    //             { _id: id, "wages._id": wageId},
    //             {
    //                 $set:{
    //                     "wages.$.effectiveDate": req.body.effectiveDate,
    //                     "wages.$.hourlyRate": req.body.hourlyRate,
    //                     "wages.$.otMultiplier": req.body.otMultiplier
    //                 }
    //             },
    //             {new: true}
    //         );
    //         res.json(updatedEmployee);
    //       } catch(err){
    //         res.status(500).json({message: err.message});
    //       }
    // });


    //delete wage
    // router.delete("/emp/:id/wages/:wageId", verifyToken, async (req,res) => {
    //     try{
    //     const { id, wageId } = req.params;
    //     const updatedEmployee = await Employee.findByIdAndUpdate(
    //         id,
    //         {
    //             $pull: {
    //                 wages: {_id: wageId}
    //             }
    //         },
    //         {new: true}
    //     );
    //     res.json(updatedEmployee);
    //     } catch(err) {
    //         res.status(500).json({message: req.message});
    //     }
    // });

export default router;