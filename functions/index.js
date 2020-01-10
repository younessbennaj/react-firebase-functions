const functions = require('firebase-functions');
// const admin = require('firebase-admin');
const express = require('express');
const firebase = require('firebase');

var cors = require('cors')

const app = express();

const { FBAuth } = require('./util/fbAuth');

const { getAllPosts, postOnePost, getPost, commentOnPost } = require('./handlers/posts');
const { signup, login, uploadImage, addUserDetails, getAuthenticatedUser } = require('./handlers/users');

const { db } = require('./util/admin');

//enable cross-origin resource sharing

app.use(cors());

//Post routes

app.get('/posts', getAllPosts);

app.post('/post', FBAuth, postOnePost);

app.get('/post/:postId', getPost);

app.post('/post/:postId/comment', FBAuth, commentOnPost);
/*
TODO: 

delete post
like a post
unlike a post
comment on post
*/

//Users routes

app.post('/signup', signup);

app.post('/login', login);

app.post('/user/image', FBAuth, uploadImage);

app.post('/user', FBAuth, addUserDetails);

app.get('/user', FBAuth, getAuthenticatedUser);

exports.api = functions.region('europe-west1').https.onRequest(app);

