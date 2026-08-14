import { createValidationError } from '../../utils/httpError.js';
export function validateRequest(schema, target = 'body') {
    return (req, _res, next) => {
        const result = schema.safeParse(req[target]);
        if (!result.success) {
            return next(createValidationError(result.error));
        }
        req[target] = result.data;
        return next();
    };
}
