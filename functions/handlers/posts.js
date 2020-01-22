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
        userFirstName: req.user.firstName,
        userLastName: req.user.lastName,
        userImage: req.user.imageUrl,
        likeCount: 0,
        commentCount: 0,
        createdAt: new Date().toISOString(),
        body: req.body.body
    };

    //add() auto-generate an ID for the document
    db.collection("posts").add(newPost)
        .then(doc => {
            const resPost = newPost;
            resPost.postId = doc.id;
            res.json(resPost);
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
        userFirstName: req.user.firstName,
        userLastName: req.user.lastName,
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

exports.likeOnPost = (req, res) => {
    const likeDocument = db
        .collection('likes')
        .where('userFirstName', '==', req.user.firstName)
        .where('userLastName', '==', req.user.lastName)
        .where('postId', '==', req.params.postId)
        .limit(1);

    const postDocument = db.doc(`/posts/${req.params.postId}`);

    let postData;

    postDocument
        .get()
        .then((doc) => {
            if (doc.exists) {
                postData = doc.data();
                postData.postId = doc.id;
                return likeDocument.get();
            } else {
                return res.status(404).json({ error: 'Post not found' });
            }
        })
        .then((data) => {
            if (data.empty) {
                return db
                    .collection('likes')
                    .add({
                        postId: req.params.postId,
                        userFirstName: req.user.firstName,
                        userLastName: req.user.lastName
                    })
                    .then(() => {
                        postData.likeCount++;
                        return postDocument.update({ likeCount: postData.likeCount });
                    })
                    .then(() => {
                        return res.json(postData);
                    });
            } else {
                return res.status(400).json({ error: 'Post already liked' });
            }
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({ error: err.code });
        });
}

exports.unlikeOnPost = (req, res) => {

}


