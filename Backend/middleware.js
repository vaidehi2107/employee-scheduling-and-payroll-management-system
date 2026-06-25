import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    try{
        const token = req.headers.authorization?.split(" ")[1];
        if(!token) return res.status(401).json({message: "No token provided"});

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.role = decoded.role;
        req.companyId = decoded.companyId;
        next();
    }catch(err){
        res.status(401).json({message: "Invalid Token"});
    }
};

export const adminOnly = (req, res, next) => {
     if (req.role !== "admin") return res.status(403).json({ message: "Access denied" });
    next();
}; 