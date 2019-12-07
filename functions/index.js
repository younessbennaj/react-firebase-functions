const functions = require('firebase-functions');
// const admin = require('firebase-admin');
const express = require('express');
const firebase = require('firebase');

const app = express();

const { FBAuth } = require('./util/fbAuth');

const { getAllPosts, postOnePost } = require('./handlers/posts');
const { signup, login } = require('./handlers/users');

const { db } = require('./util/admin');

//Post routes

app.get('/posts', getAllPosts);

app.post('/post', FBAuth, postOnePost);

//Users routes

app.post('/signup', signup);

app.post('/login', login);

exports.api = functions.region('europe-west1').https.onRequest(app);

