@description('Nombre base del proyecto')
param projectName string = 'clima-serverless'

@description('Ubicación de los recursos')
param location string = 'eastus2'



@description('Activar modo gratuito en Cosmos DB')
param enableFreeTier bool = true

// Cosmos DB account
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: '${projectName}-db'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableFreeTier: enableFreeTier
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
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

// Storage Account (para Function y frontend)
resource storage 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: '${projectName}st${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
  }
}

// Azure Function App
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${projectName}-plan'
  location: location
  sku: {
    name: 'Y1' // Consumption (serverless)
    tier: 'Dynamic'
  }
}

resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: '${projectName}-func'
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
  { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
  { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
  { name: 'AzureWebJobsStorage', value: storage.properties.primaryEndpoints.blob }
  { name: 'COSMOS_URL', value: cosmosAccount.properties.documentEndpoint }
  { name: 'COSMOS_KEY', value: cosmosAccount.listKeys().primaryMasterKey }
  { name: 'COSMOS_DB_NAME', value: 'clima_serverless_db' }
  { name: 'COSMOS_CONTAINER', value: 'registros_temperatura' }
      ]
    }
  }
}

// Static Web App (frontend)
resource staticWeb 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${projectName}-frontend'
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: 'https://github.com/<tu_usuario>/<tu_repo>'
    branch: 'main'
    buildProperties: {
      appLocation: '/'
      outputLocation: '/'
    }
  }
}
