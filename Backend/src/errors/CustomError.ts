// Base class for custom errors
export class CustomError extends Error {
    statusCode: number;
    publicMessage: string;

    constructor(message: string, statusCode: number, publicMessage: string) {
        super(message);  // 'message' is a standard Error property
        this.statusCode = statusCode;
        this.publicMessage = publicMessage;
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    }
}

// Define specific custom error types
export class NotFoundError extends CustomError {
    constructor(publicMessage: string) {
        super('Resource not found', 404, publicMessage);
    }
}

export class UnauthorizedError extends CustomError {
    constructor(publicMessage: string) {
        super('Unauthorized access', 401, publicMessage);
    }
}

export class BadRequestError extends CustomError {
    constructor(publicMessage: string) {
        super('Bad request', 400, publicMessage);
    }
}
