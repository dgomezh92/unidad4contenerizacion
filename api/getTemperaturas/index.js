const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
    context.log('Getting temperatures data');

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

        context.res = {
            status: 200,
            body: items
        };
    } catch (error) {
        context.log.error('Error:', error);
        context.res = {
            status: 500,
            body: "Error retrieving data from the database"
        };
    }
}