import { createChallenge, listChallenges } from '../../../services/challengeService.js';
export async function listChallengesHandler(_req, res, next) {
    try {
        const items = await listChallenges();
        res.json({ items });
    }
    catch (error) {
        next(error);
    }
}
export async function challengeHandler(req, res, next) {
    try {
        const challenge = await createChallenge(req.body);
        res.status(201).json(challenge);
    }
    catch (error) {
        next(error);
    }
}
