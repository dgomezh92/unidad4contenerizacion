const { CosmosClient } = require('@azure/cosmos');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// Configuración de Cosmos DB
const config = {
    endpoint: process.env.COSMOS_ENDPOINT || "https://clima-serverless-db.documents.azure.com:443/",
    key: process.env.COSMOS_KEY,
    databaseId: "clima_serverless_db",
    containerId: "registros_temperatura"
};

async function uploadData() {
    try {
        // Crear cliente de Cosmos DB
        const client = new CosmosClient({
            endpoint: config.endpoint,
            key: config.key
        });

        console.log('Conectando a Cosmos DB...');
        
        const database = client.database(config.databaseId);
        const container = database.container(config.containerId);

        // Leer el archivo CSV
        const results = [];
        const csvPath = path.join(__dirname, '..', 'upload', 'GlobalTemperatures.csv');

        await new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (data) => {
                    // Transformar los datos
                    const item = {
                        id: `${data.City}_${data.Country}_${data.dt}`.replace(/\s+/g, '_'),
                        city: data.City,
                        country: data.Country,
                        date: data.dt,
                        average_temperature: parseFloat(data.AverageTemperature) || null,
                        average_temperature_uncertainty: parseFloat(data.AverageTemperatureUncertainty) || null,
                        latitude: data.Latitude,
                        longitude: data.Longitude
                    };
                    results.push(item);
                })
                .on('end', () => {
                    resolve(results);
                })
                .on('error', (error) => {
                    reject(error);
                });
        });

        console.log(`Se encontraron ${results.length} registros para procesar`);

        // Subir los datos en lotes
        const batchSize = 100;
        for (let i = 0; i < results.length; i += batchSize) {
            const batch = results.slice(i, i + batchSize);
            await Promise.all(
                batch.map(item => 
                    container.items.upsert(item)
                        .catch(err => console.error(`Error al subir item ${item.id}:`, err))
                )
            );
            console.log(`Procesados ${Math.min(i + batchSize, results.length)} de ${results.length} registros`);
        }

        console.log('¡Carga de datos completada!');

    } catch (err) {
        console.error('Error durante la carga de datos:', err);
    }
}

// Ejecutar el script
uploadData();