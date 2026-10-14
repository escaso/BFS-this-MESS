# Application types

Students refer to a subject by its course ID, such as 6.1220. Roads and users are owned by the concepts that create them.

```types
concrete CourseId
  The ID of an MIT subject, such as 6.1220.
```

```instances
instantiate CourseOffering with
  Subject is CourseId

instantiate Constrain with
  Subject is CourseId

instantiate Authentication

instantiate Share with
  Road is Constrain.Road
  User is Authentication.User
```