// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

// Given an empty app object, initializes it filling its attributes,
// creates a Vue instance, and then initializes the Vue instance.
let init = (app) => {

    // This is the Vue data.
    app.data = {
        posts: [], // See initialization.
        user_email: user_email,
        author_name: author_name,
        profile_pic: profile_pic,
    };

    app.index = (a) => {
        // Adds to the posts all the fields on which the UI relies.
        let i = 0;
        for (let p of a) {
            p._idx = i++;
            // TODO: Only make the user's own posts editable.
            if(p.email === user_email) p.editable = true;
            else p.editable = false;
            p.edit = false;
            p.is_pending = false;
            p.error = false;
            p.original_content = p.content; // Content before an edit.
            p.server_content = p.content; // Content on the server.
        }
        return a;
    };

    app.reindex = () => {
        // Adds to the posts all the fields on which the UI relies.
        let i = 0;
        for (let p of app.vue.posts) {
            p._idx = i++;
        }
    };

    app.do_edit = (post_idx) => {
        // Handler for button that starts the edit.
        // TODO: make sure that no OTHER post is being edited.
        // If so, do nothing.  Otherwise, proceed as below.
        let p = app.vue.posts[post_idx];
        if(p.email === user_email){
            p.edit = true;
            p.is_pending = false;
        }
    };

    app.do_cancel = (post_idx) => {
        // Handler for button that cancels the edit.
        let p = app.vue.posts[post_idx];
        if (p.id === null) {
            // If the post has not been saved yet, we delete it.
            app.vue.posts.splice(post_idx, 1);
            app.reindex();
        } else {
            // We go back to before the edit.
            p.content = p.server_content;
            p.edit = false;
            p.is_pending = false;
        }
    }

    app.do_save = (post_idx) => {
        // Handler for "Save edit" button.
        let p = app.vue.posts[post_idx];
        if (p.content !== p.server_content) {
            p.is_pending = true;
            axios.post(posts_url, {
                content: p.content,
                id: p.id,
                is_reply: p.is_reply,
            }).then((result) => {
                console.log("Received:", result.data);
                // TODO: You are receiving the post id (in case it was inserted),
                // and the content.  You need to set both, and to say that
                // the editing has terminated.
                p.server_content = p.content;
                p.edit = false;
                app.init();
            }).catch(() => {
                p.is_pending = false;
                console.log("Caught error");
                // We stay in edit mode.
            });
        } else {
            // No need to save.
            p.edit = false;
            p.original_content = p.content;
        }
    }

    app.add_post = () => {
        // TODO: this is the new post we are inserting.
        // You need to initialize it properly, completing below, and ...
        let q = {
            id: null,
            edit: true,
            editable: true,
            content: "",
            server_content: "",
            original_content: "",
            author: author_name,
            email: user_email,
            profile_pic: profile_pic,
            is_reply: null,
            like: "empty",
        };
        // TODO:
        // ... you need to insert it at the top of the post list.
        app.vue.posts.unshift(q);
        app.reindex();
    };

    app.reply = (post_idx) => {
        let p = app.vue.posts[post_idx];
        if (p.id !== null) {
            // TODO: this is the new reply.  You need to initialize it properly...
            let q = {
                id: null,
                edit: true,
                editable: true,
                content: "",
                server_content: "",
                original_content: "",
                author: author_name,
                email: user_email,
                is_reply: p.id,
                profile_pic: profile_pic,
            };
            // TODO: and you need to insert it in the right place, and reindex
            // the posts.  Look at the code for app.add_post; it is similar.
            app.vue.posts.splice(post_idx+1, 0, q);
            app.reindex();
        }
    };

    app.do_delete = (post_idx) => {
        let p = app.vue.posts[post_idx];
        if (p.id === null) {
            // TODO:
            // If the post has never been added to the server,
            // simply deletes it from the list of posts.
            app.vue.posts.splice(post_idx, 1);
            app.reindex();
        } else {
            // TODO: Deletes it on the server.
            axios.post(delete_url, {id: p.id}).then(() => {
                // The deletion went through on the server. Deletes also locally.
                // Isn't it obvious that splice deletes an element?  Such is life.
                app.vue.posts.splice(post_idx, 1);
                app.reindex(app.vue.posts);
            });
        }
    };

    app.like_post = (like_idx, choice) => {
        const id = app.vue.posts[like_idx].id;
        var rating = 0;
        if(choice == 'like'){
            if(app.vue.posts[like_idx].like==='empty'){
                rating = 1;
            }
            else if(app.vue.posts[like_idx].like==='like'){
                rating = 0;
            }
            else if(app.vue.posts[like_idx].like==='dislike'){
                rating = 1;
            }
        }
        else if(choice == 'dislike'){
            if(app.vue.posts[like_idx].like==='empty'){
                rating = 2;
            }
            else if(app.vue.posts[like_idx].like==='like'){
                rating = 2;
            }
            else if(app.vue.posts[like_idx].like==='dislike'){
                rating = 0;
            }
        }
        axios.post(like_post_url, {
            post_id: id,
            rating: rating
        }).then(function (response) {
            app.init();
        });
    };

    // We form the dictionary of all methods, so we can assign them
    // to the Vue app in a single blow.
    app.methods = {
        do_edit: app.do_edit,
        do_cancel: app.do_cancel,
        do_save: app.do_save,
        add_post: app.add_post,
        reply: app.reply,
        do_delete: app.do_delete,
        like_post: app.like_post,
    };

    // This creates the Vue instance.
    app.vue = new Vue({
        el: "#vue-target",
        data: app.data,
        methods: app.methods
    });

    // And this initializes it.
    app.init = () => {
        // You should load the posts from the server.
        // This is purely debugging code.
        // TODO: Load the posts from the server instead.
        // We set the posts.
        axios.get(posts_url).then((result) => {
            let orgPosts = [];
            let org = [];
            let temp = [];
            for (let p of result.data.posts){
                if(p.is_reply === null){
                    p.edit = false;
                    p.server_content = p.content;
                    if(p.email === user_email) p.editable = true;
                    else p.editable = null;

                    org.push(p);
                }
                for(let replies of result.data.posts){
                    if(replies.is_reply === p.id){
                        replies.edit = false;
                        replies.server_content = replies.content;
                        if(replies.email === user_email) replies.editable = true;
                        else replies.editable = null;
                        temp.push(replies);
                    }
                }
            }
            //temp = temp.reverse();
            org = org.reverse()
            for(let top of org){
                orgPosts.push(top);
                for(let reps of temp){
                    if(reps.is_reply === top.id) orgPosts.push(reps);
                }
            }
            app.vue.posts = orgPosts;
            app.reindex();
        });
    };

    // Call to the initializer.
    app.init();
};

// This takes the (empty) app object, and initializes it,
// putting all the code i
init(app);
