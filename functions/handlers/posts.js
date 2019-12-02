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
                console.log(doc.id, " => ", doc.data());
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

