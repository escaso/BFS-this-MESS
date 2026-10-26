# Authentication

## Purpose

Establish the identity of the person using the application, so roads can be owned and shared.

## Principle

A person registers with a username and password, then logs in to get a session. Requests that carry that session are attributed to that user until they log out.

## Types

```types
```

## State

```state
a set of Users with
  a unique username String
  a passwordHash String

a set of Sessions with
  a unique token String
  a User
```

## Actions

```actions
register(username: String, password: String) : returns (user: User)
  where username or password is empty
  then
    refuses EMPTY_CREDENTIALS "A username and a password are needed."
  where username and password are not empty and username is taken
  then
    refuses USERNAME_TAKEN "Username is already taken."
  where username and password are not empty and username is not taken
  then
    create a user with this username and the hash of the password
    returns user

login(username: String, password: String) : returns (session: String)
  where no user with this username exists, or the password does not match
  then
    refuses INVALID_CREDENTIALS "Invalid username or password."
  where a user with this username exists and the password matches
  then
    create a new session for that user
    returns session

logout(session: String) : returns ()
  where session does not exist
  then
    refuses NO_SUCH_SESSION "Session does not exist."
  where session exists
  then
    remove session
    returns
```

## Queries

```queries
_authenticate(session: String) : optional (user: User)
  Answers the user of session, or no row if session does not exist.

_lookup(username: String) : optional (user: User)
  Answers the user with this username, or no row if there is none.

_username(user: User) : one (username: String)
  where user exists. Answers the username of user.

_matching(prefix: String) : many (user: User, username: String)
  Answers the users whose username starts with prefix, ignoring case, in order of username: at most 8 of them, and none if prefix has fewer than 2 characters. It answers usernames only, so that it can suggest people to share with without listing every user.
```