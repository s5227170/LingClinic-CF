"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const getuser_1 = __importDefault(require("./routes/getuser"));
const createuser_1 = __importDefault(require("./routes/createuser"));
const decoder_1 = __importDefault(require("./middleware/decoder"));
const fileMiddleware = require("express-multipart-file-parser");
require("dotenv-flow").config();
const app = (0, express_1.default)();
var corsOptions = {};
if (process.env.NODE_ENV == "production") {
    corsOptions.credentials = true;
    corsOptions.origin = "https://final-year-project-82049.ew.r.appspot.com";
}
else {
    corsOptions.origin = "*";
}
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.json());
app.use(fileMiddleware);
app.use(decoder_1.default);
app.use("/createuser", createuser_1.default);
app.use("/getuser", getuser_1.default);
app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        message: error.message,
        data: error.data,
    });
});
app.listen(3001);
exports.users = app;
// exports.users = app;
//# sourceMappingURL=index.js.map