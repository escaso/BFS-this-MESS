# Application types

Students refer to a subject by its course ID, such as 6.1220. Roads and users are owned by the concepts that create them: Constrain creates roads and Authentication creates users. Share does not create either; it refers to the roads of Constrain and the users of Authentication.

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

instantiate Requirements with
  Subject is CourseId
  Road is Constrain.Road

instantiate Share with
  Road is Constrain.Road
  User is Authentication.User

instantiate History with
  User is Authentication.User
  Subject is CourseId

instantiate TimeBudget with
  User is Authentication.User
  Road is Constrain.Road
```