const { db } = require('../util/admin');

exports.getAllPosts = (req, res) => {
    db
        .collection("posts")
        .orderBy('createdAt', 'desc')
        .get()
        .then(function (querySnapshot) {
            let posts = [];
            querySnapshot.forEach(function (doc) {
                posts.push({
                    postId: doc.id,
                    ...doc.data()
                });
                // console.log(doc.id, " => ", doc.data());
            });
            return res.json(posts);
        })
        .catch(err => console.error(err));
}

exports.postOnePost = (req, res) => {
    if (req.body.body.trim() === '') {
        return res.status(400).json({ body: 'Body must not be empty' });
    }

    let newPost = {
        userHandle: req.user.handle,
        createdAt: new Date().toISOString(),
        body: req.body.body
    };

    //add() auto-generate an ID for the document
    db.collection("posts").add(newPost)
        .then(doc => {
            res.json({ message: `document ${doc.id} created successfuly` });
        })
        .catch(err => {
            res.status(500).json({ error: 'something went wrong' });
            console.error(err);
        });
}

exports.getPost = (req, res) => {
    db.doc(`/posts/${req.params.postId}`)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                return res.status(404).json({ error: 'Post not found' });
            }
            postData = doc.data();
            postData.postId = doc.id;
            return db
                .collection('comments')
                .orderBy('createdAt', 'desc')
                .where('postId', '==', req.params.postId)
                .get();

        })
        .then((data) => {
            console.log(data);
            postData.comments = [];
            data.forEach((doc) => {
                postData.comments.push(doc.data());
            });
            return res.json(postData);
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({ error: err.code });
        });
};

exports.commentOnPost = (req, res) => {
    if (req.body.body.trim() === '')
        return res.status(400).json({ comment: 'Must not be empty' });

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        postId: req.params.postId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };

    console.log(newComment);

    db.doc(`/posts/${req.params.postId}`)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                return res.status(404).json({ error: 'Post not found' });
            }
            return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
        })
        .then(() => {
            return db.collection('comments').add(newComment);
        })
        .then((data) => {
            console.log(data);
            res.json(newComment);
        })
        .catch((err) => {
            console.log(err);
            res.status(500).json({ error: 'Something went wrong' });
        });
}


