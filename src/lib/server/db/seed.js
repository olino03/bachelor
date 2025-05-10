import 'dotenv/config'; // Step 1b: Load .env variables into process.env
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { inferenceModel } from './schema';

async function seedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in your environment.');
    process.exit(1);
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client);

  console.log('Starting database seed...');

  try {
    console.log('Deleting existing inference models...');
    await db.delete(inferenceModel);
    console.log('Existing models deleted.');

    console.log('Fetching models from API (https://ollama-models.zwz.workers.dev/)...');
    const response = await fetch('https://ollama-models.zwz.workers.dev/', { method: 'GET' });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const fetchedModels = await response.json();
    console.log('Models fetched successfully from API.');

    if (fetchedModels && Array.isArray(fetchedModels) && fetchedModels.length > 0) {
      const modelsToInsert = fetchedModels.map((model, index) => ({
        ollamaName: model.name,
        name: model.name,
        isDefault: index === 0,
      }));

      if (modelsToInsert.length > 0) {
        console.log(`Preparing to insert ${modelsToInsert.length} models...`);
        const defaultModel = modelsToInsert.find(m => m.isDefault);
        if (defaultModel) {
          console.log(`Setting '${defaultModel.ollamaName}' as the default model.`);
        }
        await db.insert(inferenceModel).values(modelsToInsert);
        console.log('Models inserted successfully.');
      } else {
        console.log('No models to insert (array was empty after mapping, which is unexpected here).');
      }
    } else if (fetchedModels && Array.isArray(fetchedModels) && fetchedModels.length === 0) {
      console.log('API returned an empty array of models. No models to insert.');
    }
    else {
      console.log('Fetched data is not a valid array of models or API response was unexpected.');
    }

  } catch (error) {
    console.error('Error during database seeding:', error);
  } finally {
    await client.end();
    console.log('Database seed process finished.');
  }
}

seedDatabase();
