import { config } from '../infra/config/env.js';
import { logger } from '../infra/config/logger.js';
import { searchDatasetsByQuery } from '../infra/repositories/datasetRepository.js';
import { searchDatasetDocuments } from './elasticService.js';
export async function searchDatasets(query) {
    const normalizedQuery = query.trim();
    const sqlForQuery = normalizedQuery.length > 0
        ? `SELECT * FROM protocol_datasets WHERE metadata->>'name' ILIKE '%${normalizedQuery.replace(/'/g, "''")}%' LIMIT 20;`
        : 'SELECT * FROM protocol_datasets ORDER BY updated_at DESC LIMIT 20;';
    const dbResults = await searchDatasetsByQuery(normalizedQuery);
    const combined = [...dbResults];
    if (normalizedQuery && config.elasticNode) {
        try {
            const elasticResults = await searchDatasetDocuments(normalizedQuery, 20);
            if (elasticResults.length > 0) {
                const byId = new Map(combined.map((dataset) => [dataset.id, dataset]));
                for (const dataset of elasticResults) {
                    if (!byId.has(dataset.id)) {
                        combined.push(dataset);
                    }
                }
            }
        }
        catch (error) {
            logger.warn({ err: error }, 'ElasticSearch query failed, falling back to Postgres/local data');
        }
    }
    return {
        query: normalizedQuery,
        sql: sqlForQuery,
        results: combined
    };
}
