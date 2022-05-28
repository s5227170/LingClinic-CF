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
const validator = require("validator");
const createUser = express_1.default.Router();
createUser.post("", (_, req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    //Do checks here
    const errors = [];
    if (validator.isEmpty(req.body.uid)) {
        errors.push("Problem creating a user.");
    }
    if (validator.isEmpty(req.body.email)) {
        errors.push("No email provided.");
    }
    if (!validator.isEmail(req.body.email)) {
        errors.push("Problem with email format.");
    }
    if (validator.isEmpty(req.body.forename)) {
        errors.push("No forename provided.");
    }
    if (validator.isEmpty(req.body.surname)) {
        errors.push("No surname provided.");
    }
    if (errors.length > 0) {
        const error = new CustomError_1.default("Invalid input");
        error.data = errors;
        error.status = 422;
        return next(error);
    }
    const User = {
        _id: req.body.uid,
        email: req.body.email,
        forename: req.body.forename,
        surname: req.body.surname,
        avatar: "",
        type: "Client",
    };
    const client = yield mongodb_1.MongoClient.connect(process.env.DB_URL).catch((err) => {
        if (err) {
            const error = new CustomError_1.default("Failed connection");
            error.status = 500;
            return next(error);
        }
    });
    if (client) {
        const createdUser = yield client
            .db("FYP")
            .collection("Users")
            .insertOne(Object.assign({}, User));
        const user = yield client
            .db("FYP")
            .collection("Users")
            .findOne({ _id: createdUser.insertedId });
        res.status(200).send(user);
        return next();
    }
    return next();
}));
exports.default = createUser;
//# sourceMappingURL=createuser.js.map