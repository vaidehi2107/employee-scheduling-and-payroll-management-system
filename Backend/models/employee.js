import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({

    firstName : {
        type : String,
        required: true
    },

    lastName : {
        type : String,
        required:true
    },

    SSN : Number,

    birthDate : Date,

    joiningDate : Date,

    status : String,

    physicalAddress : {
        addr1: String,
        addr2: String,
        country: String,
        state: String,
        city: String,
        zipCode: Number
    },

    mailAddress : {
        addr1: String,
        addr2: String,
        country: String,
        state: String,
        city: String,
        zipCode: Number
    },

    wages: [
        {
            effectiveDate: Date,
            hourlyRate: Number,
            otMultiplier: Number
        }
    ],

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },

    designations: [
        {
            departmentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Department"
            },
            departmentName: {
                type: String,
                trim: true
            },
            jobTitle: {
                type: String,
                trim: true
            }
        }
    ]
});

export default mongoose.model("Employee", employeeSchema);