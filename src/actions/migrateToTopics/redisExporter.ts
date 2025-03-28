import { promises as fs } from 'node:fs';
import { createClient } from 'redis';

export const exportRedisDB = async (outputFile: string) => {
    const client = createClient({
        url: `rediss://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_ENDPOINT}:${process.env.REDIS_PORT}`,
    });
    await client.connect();

    const keys = await client.keys('*');
    const values = await client.mGet(keys);

    const data: Record<string, null | string> = {};
    keys.forEach((key, index) => {
        data[key] = values[index];
    });

    return fs.writeFile(outputFile, JSON.stringify(data, null, 2));
};
