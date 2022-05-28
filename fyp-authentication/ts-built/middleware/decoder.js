"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../config/config"));
const decodeToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.headers.authorization) {
        return res.json({ message: "Token not provided" });
    }
    const token = req.headers.authorization.split(" ")[1];
    try {
        const decodeValue = yield config_1.default.auth().verifyIdToken(token);
        res.locals.uid = decodeValue.uid;
        if (decodeValue) {
            return next();
        }
        return res.json({ message: "Unauthorised" });
    }
    catch (e) {
        console.log(e);
        return res.json({ message: "internal Error" });
    }
});
exports.default = decodeToken;
//# sourceMappingURL=decoder.js.map