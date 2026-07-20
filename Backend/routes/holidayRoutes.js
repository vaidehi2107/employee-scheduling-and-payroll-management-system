import express from "express";
import Holiday from "../models/holidaySchema.js";
import { verifyToken } from "../middleware.js";
import { parseDateOnly, endOfDateOnly } from "../services/dateOnly.js";

const router = express.Router();

router.post("/holidays", verifyToken, async (req,res) => {
    try{
        const { financialYear, name, date, description } = req.body;

        if(!financialYear || !name || !date) {
            return res.status(400).json({message: "Financial Year, Holiday Name and Date are required."});
        }

        const parsedDate = parseDateOnly(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({message: "Invalid date."});
        }

        //check for duplicate
        const existing = await Holiday.findOne({
            companyId: req.companyId,
            date: parsedDate
        });
        if(existing){
            return res.status(400).json({message: "Holiday already exists."});
        }

        const holiday = new Holiday({
            companyId: req.companyId,
            financialYear, name, date: parsedDate, description
        });

        await holiday.save();
        res.status(201).json({message: "Holiday added Successfully!", holiday});
    }catch(err){
        if (err.name === "ValidationError" || err.name === "CastError") {
            return res.status(400).json({message: err.message});
        }
        res.status(500).json({message: err.message});
    }
});

router.get("/holidays", verifyToken, async (req,res) => {
    try{
        const { financialYear } = req.query;

        const filter = {
            companyId: req.companyId
        };

        if (financialYear) {
            filter.financialYear = financialYear;
        }

        const holidays = await Holiday.find(filter).sort({ date: 1 });
        res.status(200).json({success: true, count: holidays.length, holidays});

    }catch(err){
        res.status(500).json({message: err.message});
    }
});

// Used by the attendance module to check if a given date is a holiday
router.get("/holidays/check", verifyToken, async (req,res) => {
    try{
        const { date } = req.query;

        if(!date){
            return res.status(400).json({message: "Date is required."});
        }

        const parsedDate = parseDateOnly(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({message: "Invalid date."});
        }

        // normalize to start/end of day so time-of-day differences don't cause a miss
        const startOfDay = parseDateOnly(date);
        const endOfDay = endOfDateOnly(date);

        const holiday = await Holiday.findOne({
            companyId: req.companyId,
            date: { $gte: startOfDay, $lte: endOfDay }
        });

        res.status(200).json({
            success: true,
            isHoliday: !!holiday,
            holiday: holiday || null
        });

    }catch(err){
        res.status(500).json({message: err.message});
    }
});

router.put("/holiday/:id", verifyToken, async (req, res) => {
    try{
        const { financialYear, name, date, description } = req.body;

        if(!financialYear || !name || !date) {
            return res.status(400).json({message: "Financial Year, Holiday Name and Date are required."});
        }

        const parsedDate = parseDateOnly(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({message: "Invalid date."});
        }

        const holiday = await Holiday.findOne({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!holiday) {
            return res.status(404).json({success: false, message: "Holiday not found."});
        }

        // Check duplicate date (excluding current holiday)
        const existingHoliday = await Holiday.findOne({
            companyId: req.companyId,
            date: parsedDate,
            _id: { $ne: req.params.id }
        });

        if (existingHoliday) {
            return res.status(400).json({message: "A holiday already exists on this date."});
        }

        holiday.financialYear = financialYear;
        holiday.name = name;
        holiday.date = parsedDate;
        holiday.description = description;

        await holiday.save();

        res.status(200).json({message: "Holiday updated successfully.",holiday});
    }catch(err){
        if (err.name === "ValidationError" || err.name === "CastError") {
            return res.status(400).json({message: err.message});
        }
        res.status(500).json({message: err.message});
    }
});

router.delete("/holiday/:id", verifyToken, async (req,res) => {
    try {
        const holiday = await Holiday.findOneAndDelete({
            _id: req.params.id,
            companyId: req.companyId
        });

        if (!holiday) {
            return res.status(404).json({message: "Holiday not found."});
        }
        
        res.status(200).json({message: "Holiday deleted successfully."});

    } catch (error) {
        console.error(error);
        res.status(500).json({message: "Internal Server Error"});
    }
});
export default router;