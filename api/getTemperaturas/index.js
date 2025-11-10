const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
    context.log('Getting temperatures data');
    
    // Log complete request details
    context.log('Request details:', {
        method: req.method,
        url: req.url,
        query: req.query,
        headers: req.headers
    });

    // Log environment variables
    context.log('Environment variables:', {
        COSMOS_URL: process.env.COSMOS_URL,
        COSMOS_DB_NAME: process.env.COSMOS_DB_NAME,
        COSMOS_CONTAINER: process.env.COSMOS_CONTAINER,
        hasKey: !!process.env.COSMOS_KEY
    });

    const city = req.query.city || '';
    
    if (!city) {
        context.res = {
            status: 400,
            body: "Please provide a city parameter"
        };
        return;
    }

    try {
        const client = new CosmosClient({
            endpoint: process.env.COSMOS_URL,
            key: process.env.COSMOS_KEY
        });

        const database = client.database(process.env.COSMOS_DB_NAME);
        const container = database.container(process.env.COSMOS_CONTAINER);

        const querySpec = {
            query: "SELECT * FROM c WHERE LOWER(c.city) LIKE LOWER(@city)",
            parameters: [
                {
                    name: "@city",
                    value: `%${city}%`
                }
            ]
        };

        const { resources: items } = await container.items.query(querySpec).fetchAll();
        
        context.log(`Found ${items.length} items for city: ${city}`);

        context.res = {
            status: 200,
            body: items,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        };
    } catch (error) {
        context.log.error('Error in function:', error);
        context.res = {
            status: 500,
            body: {
                error: error.message,
                code: error.code || 'UNKNOWN_ERROR',
                details: error.toString()
            },
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        };
    }
}