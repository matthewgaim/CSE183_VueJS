"""
This file defines actions, i.e. functions the URLs are mapped into
The @action(path) decorator exposed the function at URL:

    http://127.0.0.1:8000/{app_name}/{path}

If app_name == '_default' then simply

    http://127.0.0.1:8000/{path}

If path == 'index' it can be omitted:

    http://127.0.0.1:8000/

The path follows the bottlepy syntax.

@action.uses('generic.html')  indicates that the action uses the generic.html template
@action.uses(session)         indicates that the action uses the session
@action.uses(db)              indicates that the action uses the db
@action.uses(T)               indicates that the action uses the i18n & pluralization
@action.uses(auth.user)       indicates that the action requires a logged in user
@action.uses(auth)            indicates that the action requires the auth object

session, db, T, auth, and tempates are examples of Fixtures.
Warning: Fixtures MUST be declared with @action.uses({fixtures}) else your app will result in undefined behavior
"""

import random
import time
import uuid

from py4web import action, request, abort, redirect, URL, Field, HTTP
from py4web.utils.form import Form, FormStyleBulma
from py4web.utils.url_signer import URLSigner

from yatl.helpers import A
from . common import db, session, T, cache, auth, signed_url


url_signer = URLSigner(session)

def get_name_from_email(e):
    """Given the email of a user, returns the name."""
    u = db(db.auth_user.email == e).select().first()
    return "" if u is None else u.first_name + " " + u.last_name


# The auth.user below forces login.
@action('index')
@action.uses(auth.user, url_signer, session, db, 'index.html')
def index():
    return dict(
        # This is an example of a signed URL for the callback.
        # See the index.html template for how this is passed to the javascript.
        posts_url = URL('posts', signer=url_signer),
        delete_url = URL('delete_post', signer=url_signer),
        user_email = auth.current_user.get('email'),
        author_name = auth.current_user.get('first_name') + " " + auth.current_user.get('last_name'),
        profile_pic = auth.current_user.get('profile_pic'),
        like_post_url = URL('like_post', signer=url_signer),
     )


@action('posts', method="GET")
@action.uses(db, auth.user, session, url_signer.verify())
def get_posts():
    # You can use this shortcut for testing at the very beginning.
    # TODO: complete.
    posts = db(db.post).select().as_list()
    likes = db(db.thumb).select().as_list()
    for post in posts:
        cName = db(db.auth_user.email == post['email']).select().first()
        post["author"] = cName.first_name + " " + cName.last_name if cName is not None else "Unknown"
        post["profile_pic"] = cName.profile_pic
        post["like"] = "empty"
        post["likeCount"] = 0
        post["dislikeCount"] = 0
        for refs in likes:
            if refs['post_id'] == post['id'] and refs['user_email'] == auth.current_user.get('email'):
                if refs['rating'] == 1:
                    post["like"] = "like"
                    post["likeCount"] += 1
                elif refs['rating'] == 2:
                    post["like"] = "dislike"
                    post["dislikeCount"] += 1
                else:
                    post["like"] = "empty"

            elif refs['post_id'] == post['id']:
                if refs['rating'] == 1:
                    post["likeCount"] += 1
                elif refs['rating'] == 2:
                    post["dislikeCount"] += 1
                else:
                    post["like"] = "empty"

    return dict(posts=posts)


@action('posts',  method="POST")
@action.uses(db, auth.user)  # etc.  Put here what you need.
def save_post():
    # To help with testing.
    # TODO: optional.
    # time.sleep(1)
    # if random.random() < 0.1:
    #     raise HTTP(500)
    id = request.json.get('id') # Note: id can be none.
    content = request.json.get('content')
    image = request.json.get('image')
    is_reply = request.json.get('is_reply')
    # TODO: complete.
    # If id is None, this means that this is a new post that needs to be
    # inserted.  If id is not None, then this is an update.
    if id == None:
        db.post.insert(
            content=content,
            image=image,
            is_reply=is_reply,
        )
    else:
        db.post.update_or_insert((id == db.post.id), image=image, content=content, is_reply=is_reply)
    return dict(content=content, id=id)


@action('delete_post',  method="POST")
@action.uses(db, auth.user, session, url_signer.verify())
def delete_post():
    db((db.post.email == auth.current_user.get("email")) &
       (db.post.id == request.json.get('id'))).delete()
    return "ok"


@action('delete_all_posts')
@action.uses(db)
def delete_all_posts():
    """This should be removed before you use the app in production!"""
    db(db.post).delete()
    return "ok"

@action('like_post', method="POST")
@action.uses(url_signer.verify(), db)
def like_post():
    #TODO: Update/Insert
    id = db.thumb.update_or_insert(
        ((db.thumb.user_email == auth.current_user.get('email')) & (db.thumb.post_id == request.json.get('post_id'))),
        user_email=auth.current_user.get('email'),
        post_id=request.json.get('post_id'),
        rating=request.json.get('rating')
    )
    return dict(id=id)
