import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
export function signAdminToken(address) {
    const payload = {
        sub: address.toLowerCase(),
        role: 'admin'
    };
    return jwt.sign(payload, config.jwtSecret, {
        issuer: config.jwtIssuer,
        expiresIn: config.jwtExpirySeconds
    });
}
export function verifyAdminToken(token) {
    return jwt.verify(token, config.jwtSecret, {
        issuer: config.jwtIssuer,
        algorithms: ['HS256']
    });
}
