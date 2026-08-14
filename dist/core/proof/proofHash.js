import { keccak256, toUtf8Bytes } from 'ethers';
import { canonicalizeUsageOutputV1 } from '../canonicalize/canonicalJson.js';
export const getUsageOutputHash = (output) => {
    const outputForHash = {
        ...output,
        proof: {
            ...output.proof,
            canonical_hash: ''
        }
    };
    const canonical_json = canonicalizeUsageOutputV1(outputForHash);
    return {
        canonical_json,
        hash: keccak256(toUtf8Bytes(canonical_json))
    };
};
