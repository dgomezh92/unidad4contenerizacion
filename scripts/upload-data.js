const { CosmosClient } = require('@azure/cosmos');
const https = require('https');

// === Configuración de la API Open-Meteo ===
// Lista de ciudades con latitud y longitud
const cities = [
  { city: 'Bogotá', country: 'Colombia', lat: 4.61, lon: -74.08 },
  { city: 'Medellín', country: 'Colombia', lat: 6.25, lon: -75.56 },
  { city: 'Cali', country: 'Colombia', lat: 3.45, lon: -76.53 },
  { city: 'Barranquilla', country: 'Colombia', lat: 10.96, lon: -74.80 }
];

// Rango de fechas para obtener temperaturas promedio diarias
const startDate = '2024-01-01';
const endDate = '2024-12-31';

// === Configuración de Cosmos DB ===
const config = {
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
  databaseId: process.env.COSMOS_DB_NAME || 'clima_serverless_db',
  containerId: process.env.COSMOS_CONTAINER || 'registros_temperatura'
};

// === Función para obtener datos de Open-Meteo ===
async function fetchCityData(cityInfo) {
  const { lat, lon, city, country } = cityInfo;

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_mean&timezone=auto`;

  console.log(`Solicitando datos de ${city}...`);
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';

      if (res.statusCode !== 200) {
        return reject(new Error(`Error HTTP ${res.statusCode} para ${city}`));
      }

      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.daily || !parsed.daily.time) {
            return reject(new Error(`Datos incompletos para ${city}`));
          }

          const records = parsed.daily.time.map((date, i) => ({
            id: `${city}_${country}_${date}`.replace(/\s+/g, '_'),
            city,
            country,
            date,
            average_temperature: parsed.daily.temperature_2m_mean[i],
            latitude: lat,
            longitude: lon
          }));

          console.log(`✔ ${records.length} registros obtenidos para ${city}`);
          resolve(records);
        } catch (err) {
          reject(new Error(`Error parseando respuesta de ${city}: ${err.message}`));
        }
      });
    }).on('error', (err) => reject(err));
  });
}

// === Carga de datos a Cosmos DB ===
async function uploadData() {
  try {
    if (!config.endpoint || !config.key) {
      throw new Error('Configura las variables de entorno COSMOS_ENDPOINT y COSMOS_KEY.');
    }

    const client = new CosmosClient({ endpoint: config.endpoint, key: config.key });
    const database = client.database(config.databaseId);
    const container = database.container(config.containerId);

    console.log('Conectando a Cosmos DB...');
    await database.read();
    await container.read();
    console.log('Conexión validada ✅');

    // Obtener datos de todas las ciudades
    let allData = [];
    for (const c of cities) {
      const cityData = await fetchCityData(c);
      allData = allData.concat(cityData);
    }

    console.log(`Total de registros a cargar: ${allData.length}`);

    // Subir datos en lotes
    const batchSize = 100;
    for (let i = 0; i < allData.length; i += batchSize) {
      const batch = allData.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (item) => {
          try {
            await container.items.upsert(item);
          } catch (err) {
            console.error(`Error al insertar ${item.id}:`, err.message);
          }
        })
      );
      console.log(`Procesados ${Math.min(i + batchSize, allData.length)} / ${allData.length}`);
    }

    console.log('✅ Carga de datos completada con éxito');

  } catch (err) {
    console.error('❌ Error general:', err.message || err);
  }
}

// Ejecutar
uploadData();
