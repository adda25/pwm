'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose


module.exports = class User extends R.Resource {

    static _model = null

    model () {
        return User._model
    }

    static makeModel (kind) {
        if (this._model == null) {
            this._model = mongoose.model(kind, this.schema())
        }
    }

  	static schema () {
      	return {
    		apiVersion: String,
    		kind: String,
    		metadata: Object,
            spec: {
                contact: Object,
                limits: Object,
                groups: Array
            },
            active: {type: Boolean, default: true},
            wants: {type: String, default: 'RUN'},
            status: Array,
            currentStatus: String,
            account: Object,
    		created: {type: Date, default: new Date()}
		}
  	}

    static async FindByNameAndGroup (username, group) {
        return await (User._model).findOne({'metadata.name': username, 'metadata.group': group}).lean(true) 
    }

    isGroupRelated () {
        return true
    }

    static isGroupRelated () {
        return true
    }

    hasGroup (groupToCheck) {
        return this._p.spec.groups.map((g) => {return g.name}).includes(groupToCheck) 
    }

    policyForGroup (groupToCheck) {
        let group = this._p.spec.groups.filter((g) => {return g.name == groupToCheck})
        if (group.length > 0) {
            return group[0].policy    
        } else {
            return {}
        }
    }

 	validate () {
 	    let validationResult = {global: true, steps: []}
 	    this._validate(this._p.kind, R.RV.EQUAL, this._kind, validationResult)
 	    this._validate(this._p.metadata, R.RV.NOT_EQUAL, undefined, validationResult)
 	    this._validate(this._p.metadata.name, R.RV.NOT_EQUAL, undefined, validationResult)
 	    this._valid = validationResult
 	    return this
 	}

    _formatRes (res) {
        let result = []
        res.forEach((r) => {
            result.push(this._formatOneRes(r))
        })
        return result
    }

    _formatOneRes (res) {
        if (res == null) {
            return {error: 'Resource not exist'}
        }
        return {
            kind: res.kind,
            name: res.metadata.name,
            groups: res.spec.groups.map((g) => {return g.name}),
            wants: res.wants || null,
            status: res.currentStatus || null,
            active: res.active,
            total_used_credits: (res.account !== undefined && res.account.credits !== undefined && res.account.credits.total !== undefined) ? res.account.credits.total.toFixed(2) : null,
            weekly_used_credits: (res.account !== undefined && res.account.credits !== undefined && res.account.credits.weekly !== undefined) ? res.account.credits.weekly.toFixed(2) : null,
            weekly_credits_limit: (res.account !== undefined && res.account.credits !== undefined && res.account.credits.weekly !== undefined) ? res.spec.limits.credits.weekly.toFixed(2) : null,

        }
    }
} 