// Set up our requirements
var restify = require('restify'); 
var builder = require('botbuilder'); 
var SC = require ('node-soundcloud');
const expressSession = require('express-session');

// Sometimes handy for debugging
// const util = require('util');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.PORT || 3000, function() 
{
   console.log('%s listening to %s', server.name, server.url); 
});

// Create the bot
var connector = new builder.ChatConnector({
    appId: process.env.MY_APP_ID,
    appPassword: process.env.MY_APP_PASSWORD
})
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// Add LUIS recognizer
var recognizer = new builder.LuisRecognizer(process.env.MY_LUIS_MODEL);
var intents = new builder.IntentDialog({ recognizers: [recognizer] });
console.log('recogniser %s', recognizer);

// Add Soundcloud API stuff


// Create bot dialogs
bot.dialog('/', intents);
intents.matches(/^change name/i, [
	function (session) {
		session.beginDialog("/profile");
	},
	function (session, results) {
		session.send("Ok... Changed your name to %s", session.privateConversationData.name);
	}
]);
intents.matches('Greeting', builder.DialogAction.send('Hello.'));
intents.matches('Login', [
	function (session, args, next) {
		if (!session.privateConversationData.name) {
			session.beginDialog("/profile");
		} else {
			next();
		}
	},

	function (session, results) {
		session.send("Hello %s!", session.privateConversationData.name);
	}
]);
intents.matches('Help', builder.DialogAction.send("Basic help information goes here."));
intents.matches('AboutTheBot', builder.DialogAction.send("I'm a chat bot, built by Simon Powell to do things with music."));
intents.onDefault(builder.DialogAction.send("I'm sorry I didn't understand. I don't know a lot yet."));

bot.dialog("/profile", [
	function (session) {
		builder.Prompts.text(session, "Hi! What is your name?");
	},

	function (session, results) {
		if (results.response.match(/login/gi)) {
SC.init({
  id: process.env.MY_SC_ID,
  secret: process.env.MY_SC_SECRET,
  uri: process.env.MY_SC_URI
})

        url = SC.getConnectUrl();
        console.log('URL is %s', url)

			session.send(new builder.Message(session).addAttachment(
				new builder.SigninCard(session)
					.text("Authenticate with Soundcloud")
					.button("Sign-In", url))
			);
		} else {
			session.privateConversationData.name = results.response;
			session.endDialog();
		}
	}
]);

// web interface
server.get('/', restify.serveStatic({
 directory: __dirname,
 default: '/index.html',
}));

server.get('/api/oauthcallback/', function (req, res, next) {  
   console.log('OAuth Callback');
   // console.log(req);
   var code = req.query.code;

   SC.authorize(code, function(err, accessToken) {
   if ( err ) {
     throw err;
   } else {
     // Client is now authorized and able to make API calls 
    console.log('access token: %s', accessToken);
    bot.beginDialog(address, "/oauth-success", accessToken);
    }
  });
});