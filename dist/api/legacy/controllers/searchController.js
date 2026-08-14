import { searchDatasets } from '../../../services/searchService.js';
export async function searchHandler(req, res, next) {
    try {
        const query = req.query.q ?? req.headers['x-search-query'];
        const result = await searchDatasets(query ?? '');
        res.json(result);
    }
    catch (error) {
        next(error);
    }
}
