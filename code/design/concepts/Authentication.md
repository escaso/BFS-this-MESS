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
  where username and password are not empty and username is not taken
  then
    create a user with this username and the hash of the password
    returns user

login(username: String, password: String) : returns (session: String)
  where a user with this username exists and the password matches
  then
    create a new session for that user
    returns session

logout(session: String) : returns ()
  where session exists
  then
    remove session
    returns
```

## Queries

```queries
_authenticate(session: String) : one (user: User)
  where session exists. Answers the user of session.
```