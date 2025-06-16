import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { inferenceModel } from './schema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const jsonPath = path.join(__dirname, 'ollama_models.json');
    console.log(`Loading models from: ${jsonPath}`);

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`JSON file not found at ${jsonPath}`);
    }

    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    if (Array.isArray(jsonData) && jsonData.length > 0) {
      const modelsToInsert = jsonData.flatMap((model, modelIndex) => 
        model.weight.map((weight, weightIndex) => ({
          ollamaName: `${model.name}:${weight}`,
          name: model.name,
          isDefault: modelIndex === 0 && weightIndex === 0
        }))
      );

      console.log(`Preparing to insert ${modelsToInsert.length} model variants...`);
      
      const defaultModel = modelsToInsert.find(m => m.isDefault);
      if (defaultModel) {
        console.log(`Setting '${defaultModel.ollamaName}' as the default model.`);
      }
      
      await db.insert(inferenceModel).values(modelsToInsert);
      console.log('Model variants inserted successfully.');
    } else {
      console.log('No models found in JSON file or invalid format');
    }

  } catch (error) {
    console.error('Error during database seeding:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database seed process finished.');
  }
}

seedDatabase();