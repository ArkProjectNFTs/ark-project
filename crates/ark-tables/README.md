##ark_tables Command

###Description
The ark_tables command is a utility for managing DynamoDB tables. It provides functionality to either create, delete, or recreate (delete and then create) tables with a specified prefix.

**Usage**
```shell
ark_tables --prefix <PREFIX> [--action <ACTION>]
```

**Arguments**

--prefix <PREFIX>: Specifies the table prefix to operate on. This argument is required.

--action <ACTION>: (Optional) Specifies the action to perform on the tables.

Possible values are create and delete. If this argument is omitted, the command will first delete the tables and then create them.

**Examples**

Delete Tables: This command will delete all tables with the specified prefix.

```shell
ark_tables --prefix someprefix --action delete
```

Create Tables: This command will create tables with the specified prefix.
```shell
ark_tables --prefix someprefix --action create
```
Recreate Tables: By omitting the --action flag, this command will first delete and then create the tables with the specified prefix.

```shell
ark_tables --prefix someprefix
```