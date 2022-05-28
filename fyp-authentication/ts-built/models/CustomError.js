"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CustomError extends Error {
    constructor(message) {
        super(message);
        this.status = 500;
        this.message = message;
        this.data = [];
    }
}
exports.default = CustomError;
//# sourceMappingURL=CustomError.js.map