const functions = require('firebase-functions');
// const admin = require('firebase-admin');
const express = require('express');
const firebase = require('firebase');

const app = express();

const { FBAuth } = require('./util/fbAuth');

const { getAllPosts, postOnePost } = require('./handlers/posts');
const { signup, login } = require('./handlers/users');

const { db } = require('./util/admin');

//Dialogflow fulfillment route 

app.post('/dialogflowFulfillment', (req, res) => {
    const { WebhookClient } = require('dialogflow-fulfillment');
    const agent = new WebhookClient({ request: req, response: res });

    function writeToDb(agent) {
        const databaseEntry = agent.parameters.databaseEntry;

        let newPost = {
            userHandle: 'User',
            createdAt: new Date().toISOString(),
            body: databaseEntry
        };

        return db.collection("posts").add(newPost)
            .then(doc => {
                agent.add(`Wrote "${databaseEntry}" to the databse`);
                console.log(`document ${doc.id} created successfuly`);
            })
            .catch(err => {
                res.status(500).json({ error: 'something went wrong' });
                console.error(err);
            });
    }
    let intentMap = new Map();
    intentMap.set('WriteToDatabase', writeToDb);
    agent.handleRequest(intentMap);
})

//Post routes

app.get('/posts', getAllPosts);

app.post('/post', FBAuth, postOnePost);

//Users routes

app.post('/signup', signup);

app.post('/login', login);

exports.api = functions.region('europe-west1').https.onRequest(app);

