'use strict'

// docker run -p9042:9042 --name dora-scylla --volume /Users/amedeosettits/tmp/dorascylla:/var/lib/scylla -d scylladb/scylla

const cassandra = require('cassandra-driver')

let client = null

async function initDb (DB_NAME) {
	let dbIsToCreate = false
	try {
		let dbExist = await client.execute('USE ' + DB_NAME)	
	} catch (err) {
		console.log('Keyspace', DB_NAME, 'not exist, creating')
		dbIsToCreate = true
	}	
	if (dbIsToCreate === true) {
		let queries = require('./dbschema').get(DB_NAME)
		for (const q in queries) {
			//console.log('Executing', queries[q])
			let res = await client.execute(queries[q])
		}
		return true
	} 
	return false
}

module.exports.connect = (args) => {
	client = new cassandra.Client({
	  contactPoints: args.contactPoints || ['localhost:9042'],
	  localDataCenter: args.localDataCenter || 'datacenter1'
	})
	return client
} 

module.exports.connectToKeyspace = (args) => {
	client = new cassandra.Client({
	  contactPoints: args.contactPoints || ['localhost:9042'],
	  localDataCenter: args.localDataCenter || 'datacenter1',
	  keyspace: args.keyspace
	})
	return client
} 

module.exports.disconnect = (args) => {
	client.shutdown()
} 

module.exports.init = async (args) => {
	return await initDb(args.dbName)
} 

module.exports.client = client

module.exports.drop = async (args) => {
	await client.execute('DROP KEYSPACE ' + args.dbName)
}