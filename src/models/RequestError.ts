import { Response } from 'request';

export class RequestError extends Error {
    constructor(message: string, public response?: Response | undefined, public body?: any) {
        super(message);
    }
}
