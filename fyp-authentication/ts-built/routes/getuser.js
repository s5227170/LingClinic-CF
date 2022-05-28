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
const express_1 = __importDefault(require("express"));
const mongodb_1 = require("mongodb");
const CustomError_1 = __importDefault(require("../models/CustomError"));
const getUser = express_1.default.Router();
getUser.get("", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield mongodb_1.MongoClient.connect(process.env.DB_URL).catch((err) => {
        if (err) {
            const error = new CustomError_1.default("Failed connection");
            error.status = 500;
            return next(error);
        }
    });
    if (client) {
        const user = yield client
            .db("FYP")
            .collection("Users")
            .findOne({ _id: res.locals.uid });
        res.status(200).send(user);
        return next();
    }
    return next();
}));
exports.default = getUser;
//# sourceMappingURL=getuser.js.map