import { drizzle } from "drizzle-orm/d1";
import * as schema from "../db/schema";
export const database = (binding: D1Database) => drizzle(binding, { schema });
