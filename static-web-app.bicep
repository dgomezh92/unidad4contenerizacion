@description('Nombre base del proyecto')
param projectName string = 'clima-serverless'

@description('Ubicación de los recursos')
param location string = 'eastus2'

// Cosmos DB account
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: '${projectName}-db'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: true
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
  }
}

// Cosmos DB database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-04-15' = {
  name: 'clima_serverless_db'
  parent: cosmosAccount
  properties: {
    resource: {
      id: 'clima_serverless_db'
    }
  }
}

// Cosmos DB container
resource cosmosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-04-15' = {
  name: 'registros_temperatura'
  parent: cosmosDatabase
  properties: {
    resource: {
      id: 'registros_temperatura'
      partitionKey: {
        paths: ['/country']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
      }
    }
  }
}

// Static Web App with API (frontend + backend)
resource staticWeb 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${projectName}-app'
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: 'https://github.com/dgomezh92/unidad4contenerizacion'
    branch: 'main'
    buildProperties: {
      appLocation: '/Webproject'
      apiLocation: '/api'
      outputLocation: '/'
    }
    allowConfigFileUpdates: true
  }
}

// Static Web App Config Settings
resource staticWebConfig 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: staticWeb
  name: 'appsettings'
  properties: {
    COSMOS_URL: cosmosAccount.properties.documentEndpoint
    COSMOS_KEY: cosmosAccount.listKeys().primaryMasterKey
    COSMOS_DB_NAME: 'clima_serverless_db'
    COSMOS_CONTAINER: 'registros_temperatura'
  }
}
