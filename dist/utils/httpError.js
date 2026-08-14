import createHttpError from 'http-errors';
export function createValidationError(error) {
    return createHttpError(400, 'Validation failed', {
        errors: error.flatten()
    });
}
export function createNotFoundError(entity, id) {
    return createHttpError(404, `${entity} with id ${id} not found`);
}
