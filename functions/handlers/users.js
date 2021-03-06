const { isEmpty, isEmail } = require('../util/validators');
const { db, admin } = require('../util/admin');
const config = require('../util/config');
const firebase = require('firebase');
firebase.initializeApp(config);

const {
    validateSignupData,
    validateLoginData,
    reduceUserDetails
} = require('../util/validators');

exports.signup = (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        firstName: req.body.firstName,
        lastName: req.body.lastName
    };

    const { valid, errors } = validateSignupData(newUser);

    if (!valid) return res.status(400).json(errors);

    const noImg = 'no-img.png';

    let token, userId;
    db.doc(`/users/${newUser.firstName}_${newUser.lastName}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                return res.status(400).json({ name: 'this name is already taken' });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${
                    config.storageBucket
                    }/o/${noImg}?alt=media`,
                userId
            };
            return db.doc(`/users/${newUser.firstName}_${newUser.lastName}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token });
        })
        .catch((err) => {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                return res.status(400).json({ email: 'Email is already is use' });
            } else {
                return res
                    .status(500)
                    .json({ general: 'Something went wrong, please try again' });
            }
        });
};

exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    const { valid, errors } = validateLoginData(user);

    if (!valid) return res.status(400).json(errors);

    if (Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        }).then(token => {
            return res.status(201).json({ token });
        })
        .catch(err => {
            if (err.code === 'auth/wrong-password') {
                return res.status(400).json({ general: 'Wrong password' });
            } else if (err.code === 'auth/user-not-found') {
                return res.status(400).json({ user: 'User not found' });
            } else {
                return res.status(500).json({ error: err.code });
            }
        });
}

// Add user details
exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.firstName}_${req.user.lastName}`)
        .update(userDetails)
        .then(() => {
            return res.json({ message: 'Details added successfully' });
        })
        .catch((err) => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        });
};

exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.firstName}_${req.user.lastName}`)
        .get()
        .then((doc) => {

            if (doc.exists) {
                userData.credentials = doc.data();
                console.log(userData);
                return db
                    .collection('likes')
                    .where('userFirstName', '==', req.user.firstName)
                    .where('userLastName', '==', req.user.lastName)
                    .get();
            }
        })
        .then((data) => {
            userData.likes = [];
            data.forEach((doc) => {
                userData.likes.push(doc.data());
            });
            return res.json(userData);
            // return db
            //     .collection('notifications')
            //     .where('recipient', '==', req.user.handle)
            //     .orderBy('createdAt', 'desc')
            //     .limit(10)
            //     .get();
        })
        // .then((data) => {
        //     userData.notifications = [];
        //     data.forEach((doc) => {
        //         userData.notifications.push({
        //             recipient: doc.data().recipient,
        //             sender: doc.data().sender,
        //             createdAt: doc.data().createdAt,
        //             postId: doc.data().postId,
        //             type: doc.data().type,
        //             read: doc.data().read,
        //             notificationId: doc.id
        //         });
        //     });
        //     return res.json(userData);
        // })
        .catch((err) => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        });
};

exports.uploadImage = (req, res) => {
    const Busboy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
    const uuidv1 = require('uuid/v1');

    const busboy = new Busboy({ headers: req.headers });

    let imageFileName;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(400).json({ error: 'Wrong file type submitted' });
        }
        //get the file exetntion ex: .jpg, .png
        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        //ex: 2c5ea4c0-4067-11e9-8bad-9b1deb4d3b7d.png
        imageFileName = `${uuidv1()}.${imageExtension}`;
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on('finish', () => {
        admin
            .storage()
            .bucket()
            .upload(imageToBeUploaded.filepath, {
                resumable: false,
                metadata: {
                    metadata: {
                        contentType: imageToBeUploaded.mimetype
                    }
                }
            })
            .then(() => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
                    config.storageBucket
                    }/o/${imageFileName}?alt=media`;
                console.log('_______');
                console.log(imageUrl);
                return db.doc(`/users/${req.user.firstName}_${req.user.lastName}`).update({ imageUrl });
            })
            .then(() => {
                return res.json({ message: 'image uploaded successfully' });
            })
            .catch((err) => {
                console.error(err);
                return res.status(500).json({ error: 'something went wrong' });
            });
    });

    busboy.end(req.rawBody);
}