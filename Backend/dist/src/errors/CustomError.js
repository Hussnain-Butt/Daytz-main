"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadRequestError = exports.UnauthorizedError = exports.NotFoundError = exports.CustomError = void 0;
// Base class for custom errors
class CustomError extends Error {
    constructor(message, statusCode, publicMessage) {
        super(message); // 'message' is a standard Error property
        this.statusCode = statusCode;
        this.publicMessage = publicMessage;
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    }
}
exports.CustomError = CustomError;
// Define specific custom error types
class NotFoundError extends CustomError {
    constructor(publicMessage) {
        super('Resource not found', 404, publicMessage);
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends CustomError {
    constructor(publicMessage) {
        super('Unauthorized access', 401, publicMessage);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class BadRequestError extends CustomError {
    constructor(publicMessage) {
        super('Bad request', 400, publicMessage);
    }
}
exports.BadRequestError = BadRequestError;
