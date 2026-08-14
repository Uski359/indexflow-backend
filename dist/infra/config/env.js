import dotenv from "dotenv";
dotenv.config();
import { loadBackendConfig } from "../../../config/dist/index.js";
export const config = loadBackendConfig();
