var config = {}

config.host = process.env.HOST || "https://soundbot.documents.azure.com:443/";
config.authKey = process.env.AUTH_KEY || "3j57423b4Rb36Jqba4bI3yHF1Xi63AhelGWkTvGVEAIW9mFP3NljO1BmvAPkE0dY6PSuxPSAeT6qGOnVXui9kg==";
config.databaseId = "SoundBot";
config.collectionId = "Jams";

module.exports = config;