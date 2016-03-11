I reviewed the code base and this outline is my assessment of what needs to be updated to integrate cassandra CQL into
sequelize.

I considered two approaches:
1. Make a standalone plugin
2. Integrate cassandra as a dialect into the core sequelize

Seems like option 2 is the way Sequelize is setup to function when it comes to dialects so this is the way I will approach it.

# Assumptions
The official [Cassandra nodejs driver](https://github.com/datastax/nodejs-driver) will be used as the connector.


# Proposed Changes To Integrate Cassandra CQL As Dialect
## /lib/sequelize.js
Changes required:
* Add cassandra dialect to the switchcase
* Add cassandra specific options and config (It seems like this should be moved to the /lib/dialects folder to separate the concerns and make it easier to refactor as a plugin later? Perhaps a options.js file in the dialect folder?) This config script would also have to remove sql specific concepts.
* `Sequelize.protoype.define` may need to override in the dialect folder since some of the SQL concepts don't apply to CQL. I imagine you would want it to throw a fault if an SQL option is passed to a cassandra model definition. Not quite sure the best way to handle this?
* `Sequelize.prototype.query` may need to override in the dialect folder to customize it for CQL. Same issues as last point.
* `Sequelize.prototype.transaction` may need to override due to different [Cassandra Transaction Management](https://docs.datastax.com/en/cassandra/2.0/cassandra/dml/dml_about_transactions_c.html)

## /lib/dialects/cassandra
Create the following files

### /lib/dialects/cassandra/index.js
Bootstrap the dialect

### /lib/dialects/cassandra/connection-manager.js
Contact point and keyspace configuration and connection client setup.

### /lib/dialects/cassandra/data-types.js
Provide data type mapping to the [CQL types](https://docs.datastax.com/en/cql/3.1/cql/cql_reference/cql_data_types_c.html)

### /lib/dialects/cassandra/query.js
Provide query handlers including:
* Since Cassandra doesn't allow foreign keys or joins there should be a handler to achieve foreign key like behavior

### /lib/dialects/cassandra/query-generator.js
Provide query generators for CQL

## /test
I didn't dive too deeply into the test folder yet but at first glance it would seem the following is needed.

### /test/unit
#### /test/unit/cql
Create a new folder with CQL specific tests. Can seed from the sql folder, many overlaps

#### /test/unit/dialects/cassandra
Create cassandra specific tests

## /docs
### /docs/articles
* Create a Cassandra specific document describing usage in the Cassandra dialect context

# Potential Additions
Several additional functions could be provided:
* handler functions to sync between foreign keys in other sequelize database types (for example to allow a user to run a MySQL and Cassandra database in parallel and keep their keys synced.)

