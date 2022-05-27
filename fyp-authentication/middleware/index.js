const admin = require("../config/config");

class Middleware {
    async decodeToken(req, res, next) {
        if(!req.headers.authorization) {
            return res.json({ message: "Token not provided" });
        }

        const token = req.headers.authorization.split(" ")[1];

        try {
            const decodeValue = await admin.auth().verifyIdToken(token);
            res.locals.uid = decodeValue.uid

            if (decodeValue) {
                return next()
            }

            return res.json({ message: "Unauthorised" });
        } catch (e) {
            console.log(e)
            return res.json({ message: "internal Error" });
        }


    }
}

module.exports = new Middleware();