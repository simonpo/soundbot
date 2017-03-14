// Set up our requirements
var builder = require('botbuilder')
	, express = require('express')
  , expressSession = require('express-session')
  , passport = require('passport')
  , SoundCloudStrategy = require('passport-soundcloud').Strategy
  , querystring = require('querystring')
  , restify = require('restify')
	, util = require('util');

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete SoundCloud profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the SoundCloudStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and SoundCloud
//   profile), and invoke a callback with a user object.
passport.use(new SoundCloudStrategy({
    clientID: process.env.MY_SC_ID,
    clientSecret: process.env.MY_SC_SECRET,
    callbackURL: process.env.MY_SC_URI
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // To keep the example simple, the user's SoundCloud profile is returned
      // to represent the logged-in user.  In a typical application, you would
      // want to associate the SoundCloud account with a user record in your
      // database, and return that user instead.
      return done(null, profile);
    });
  }
));

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
server.get('/', restify.serveStatic({
 directory: __dirname,
 default: '/index.html',
}));

// Add LUIS recognizer
// var recognizer = new builder.LuisRecognizer(process.env.MY_LUIS_MODEL);
// var intents = new builder.IntentDialog({ recognizers: [recognizer] });

server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(expressSession({ secret: 'keyboard cat', resave: true, saveUninitialized: false }));
server.use(passport.initialize());

server.get('/login', function (req, res, next) {
  passport.authenticate('soundcloud', { failureRedirect: '/login', customState: req.query.address, resourceURL: process.env.MICROSOFT_RESOURCE }, function (err, user, info) {
    console.log('login');
    if (err) {
      console.log(err);
      return next(err);
    }
    if (!user) {
      return res.redirect('/login');
    }
    req.logIn(user, function (err) {
      if (err) {
        return next(err);
      } else {
        return res.send('Welcome ' + req.user.displayName);
      }
    });
  })(req, res, next);
});

server.get('/api/oauthcallback/',
  passport.authenticate('soundcloud', { failureRedirect: '/login' }),
  (req, res) => {
    console.log('Starting OAuthCallback - here is what I got:' );
 //   console.log(req);
    console.log(util.inspect(req, false, null));
    console.log('Welcome to %s', { user: req.user });
    return res.send('Welcome ' + { user: req.user }); 
});

//=========================================================
// Bots Dialogs
//=========================================================
function login(session) {
  // Generate signin link
  const address = session.message.address;
  const link = 'https://soundcloud.com/connect?client_id=' + process.env.MY_SC_ID + '&client_secret=' + process.env.MY_SC_SECRET + '&redirect_uri=' + process.env.MY_SC_URI + '&response_type=code&scope=non-expiring';
  

  var msg = new builder.Message(session) 
    .attachments([ 
        new builder.SigninCard(session) 
            .text("Click here to sign in with SoundCloud.") 
            .button("signin", link) 
    ]); 
  session.send(msg);
//  builder.Prompts.text(session, "You must sign into your account.");
}

bot.dialog('signin', [
  (session, results) => {
    console.log('signin callback: ' + results);
    session.endDialog();
  }
]);

bot.dialog('/', [
  (session, args, next) => {
    if (!(session.userData.userName && session.userData.accessToken && session.userData.refreshToken)) {
      session.send("Welcome! This bot helps you interact with SoundCloud - after you login.");
      session.beginDialog('signinPrompt');
    } else {
      next();
    }
  },
  (session, results, next) => {
    if (session.userData.userName && session.userData.accessToken && session.userData.refreshToken) {
      // They're logged in
      builder.Prompts.text(session, "Welcome " + session.userData.userName + "! You are currently logged in. To get the latest email, type 'email'. To quit, type 'quit'. To log out, type 'logout'. ");
    } else {
      session.endConversation("Goodbye.");
    }
  },
  (session, results, next) => {
    var resp = results.response;
    if (resp === 'email') {
      session.beginDialog('workPrompt');
    } else if (resp === 'quit') {
      session.endConversation("Goodbye.");
    } else if (resp === 'logout') {
      session.userData.loginData = null;
      session.userData.userName = null;
      session.userData.accessToken = null;
      session.userData.refreshToken = null;
      session.endConversation("You have logged out. Goodbye.");
    } else {
      next();
    }
  },
  (session, results) => {
    session.replaceDialog('/');
  }
]);

bot.dialog('workPrompt', [
  (session) => {
    getUserLatestEmail(session.userData.accessToken,
        function (requestError, result) {
          if (result && result.value && result.value.length > 0) {
            const responseMessage = 'Your latest email is: "' + result.value[0].Subject + '"';
            session.send(responseMessage);
            builder.Prompts.confirm(session, "Retrieve the latest email again?");
          }else{
            console.log('no user returned');
            if(requestError){
              console.log('requestError');
              console.error(requestError);
              // Get a new valid access token with refresh token
              getAccessTokenWithRefreshToken(session.userData.refreshToken, (err, body, res) => {

                if (err || body.error) {
                  console.log(err);
                  session.send("Error while getting a new access token. Please try logout and login again. Error: " + err);
                  session.endDialog();
                }else{
                  session.userData.accessToken = body.accessToken;
                  getUserLatestEmail(session.userData.accessToken,
                    function (requestError, result) {
                      if (result && result.value && result.value.length > 0) {
                        const responseMessage = 'Your latest email is: "' + result.value[0].Subject + '"';
                        session.send(responseMessage);
                        builder.Prompts.confirm(session, "Retrieve the latest email again?");
                      }
                    }
                  );
                }
                
              });
            }
          }
        }
      );
  },
  (session, results) => {
    var prompt = results.response;
    if (prompt) {
      session.replaceDialog('workPrompt');
    } else {
      session.endDialog();
    }
  }
]);

bot.dialog('signinPrompt', [
  (session, args) => {
    if (args && args.invalid) {
      // Re-prompt the user to click the link
      builder.Prompts.text(session, "please click the signin link.");
    } else {
      login(session);
    }
  },
  (session, results) => {
    //resuming
    session.userData.loginData = JSON.parse(results.response);
    if (session.userData.loginData && session.userData.loginData.magicCode && session.userData.loginData.accessToken) {
      session.beginDialog('validateCode');
    } else {
      session.replaceDialog('signinPrompt', { invalid: true });
    }
  },
  (session, results) => {
    if (results.response) {
      //code validated
      session.userData.userName = session.userData.loginData.name;
      session.endDialogWithResult({ response: true });
    } else {
      session.endDialogWithResult({ response: false });
    }
  }
]);

bot.dialog('validateCode', [
  (session) => {
    builder.Prompts.text(session, "Please enter the code you received or type 'quit' to end. ");
  },
  (session, results) => {
    const code = results.response;
    if (code === 'quit') {
      session.endDialogWithResult({ response: false });
    } else {
      if (code === session.userData.loginData.magicCode) {
        // Authenticated, save
        session.userData.accessToken = session.userData.loginData.accessToken;
        session.userData.refreshToken = session.userData.loginData.refreshToken;

        session.endDialogWithResult({ response: true });
      } else {
        session.send("hmm... Looks like that was an invalid code. Please try again.");
        session.replaceDialog('validateCode');
      }
    }
  }
]);

function getAccessTokenWithRefreshToken(refreshToken, callback){
  console.log("getAccessTokenWithRefreshToken");
  var data = 'grant_type=refresh_token' 
        + '&refresh_token=' + refreshToken
        + '&client_id=' + process.env.MY_APP_ID
        + '&client_secret=' + encodeURIComponent(process.env.MY_APP_PASSWORD) 

  var options = {
      method: 'POST',
      url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      body: data,
      json: true,
      headers: { 'Content-Type' : 'application/x-www-form-urlencoded' }
  };

  request(options, function (err, res, body) {
      if (err) return callback(err, body, res);
      if (parseInt(res.statusCode / 100, 10) !== 2) {
          if (body.error) {
              return callback(new Error(res.statusCode + ': ' + (body.error.message || body.error)), body, res);
          }
          if (!body.access_token) {
              return callback(new Error(res.statusCode + ': refreshToken error'), body, res);
          }
          return callback(null, body, res);
      }
      callback(null, {
          accessToken: body.access_token,
          refreshToken: body.refresh_token
      }, res);
  }); 
}

function getUserLatestEmail(accessToken, callback) {
  var options = {
    host: 'outlook.office.com', //https://outlook.office.com/api/v2.0/me/messages
    path: '/api/v2.0/me/MailFolders/Inbox/messages?$top=1',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Bearer ' + accessToken
    }
  };
  https.get(options, function (response) {
    var body = '';
    response.on('data', function (d) {
      body += d;
    });
    response.on('end', function () {
      var error;
      if (response.statusCode === 200) {
        callback(null, JSON.parse(body));
      } else {
        error = new Error();
        error.code = response.statusCode;
        console.log(response.statusMessage);
        error.message = response.statusMessage;
        // The error body sometimes includes an empty space
        // before the first character, remove it or it causes an error.
        // body = body.trim();
        // console.log(body);
        // error = body;
        callback(response.statusMessage, null);
      }
    });
  }).on('error', function (e) {
    callback(e, null);
  });
}