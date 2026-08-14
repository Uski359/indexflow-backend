import { verifyMessage } from 'ethers';
import createHttpError from 'http-errors';
export async function verifyValidatorSignature(req, _res, next) {
    const validatorAddress = req.headers['x-validator-address']?.toLowerCase();
    const signature = req.headers['x-validator-signature'];
    if (!validatorAddress || !signature) {
        return next(createHttpError(401, 'Validator signature is required.'));
    }
    try {
        const message = JSON.stringify(req.body ?? {});
        const recovered = verifyMessage(message, signature).toLowerCase();
        if (recovered !== validatorAddress) {
            return next(createHttpError(401, 'Invalid validator signature.'));
        }
        req.validatorAddress = validatorAddress;
        return next();
    }
    catch (error) {
        return next(createHttpError(401, 'Unable to verify validator signature.'));
    }
}
