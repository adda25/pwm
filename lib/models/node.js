'use strict'

let R = require('./resource')
const mongoose = require('mongoose')
const { Schema } = mongoose

module.exports = class Node extends R.Resource {

  static _model = null

  model () {
      return Node._model
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
          metadata: {name: String, group: String, labels: Object},
          spec: Object,
          user: Object,
          properties: {gpu: Array, cpu: Array, volumes: Array, sys: Object, version: String},
          wants: {type: String, default: 'RUN'},
          status: Array,
          currentStatus: String,
          lastSeen: {type: Date, default: new Date()}, 
          created: {type: Date, default: new Date()}
      }
  }

  static async FindByZone (zone) {
      return await (Node._model).find({'spec.zone': zone}).lean(true) 
  }

  static async FindByLabelsInZone (zone, labelsAry) {
    let nodes = []
    for (var i = 0; i < labelsAry.length; i += 1) {
      let key = 'spec.labels.' + labelsAry[i].key
      let query = {
        'spec.zone': zone,
      }
      query[key] = labelsAry[i].value
      let _nodes = await (Node._model).find(query).lean(true) 
      nodes = nodes.concat(_nodes)
    }
    return nodes
  }

  static async FindAll (zone) {
      return await (Node._model).find().lean(true) 
  }

  isGroupRelated () {
      return true
  }

  static isGroupRelated () {
      return true
  }

  isZoneRelated () {
      return true
  }

  static isZoneRelated () {
      return true
  }

  isMaintenance () {
    return (this._p.spec.maintenance == null 
      || this._p.spec.maintenance == undefined 
      || this._p.spec.maintenance == false) ? false : true
  }

  allow (loadKind) {
    return this._p.spec.allow.includes(loadKind)
  }

  address () {
    return this._p.spec.address[0]
  }

  lastSeen () {

  }

  validate () {
      let validationResult = {global: true, steps: []}
      this._validate(this._p.kind, R.RV.EQUAL, this._kind, validationResult)
      this._validate(this._p.metadata, R.RV.NOT_EQUAL, undefined, validationResult)
      this._validate(this._p.metadata.name, R.RV.NOT_EQUAL, undefined, validationResult)
      this._valid = validationResult
      return this
  }

  cpuLoad (cpus) {
    let cpuLoad = 0
    cpus.forEach((cpu) => {
      cpuLoad += cpu.load
    })
    cpuLoad = (cpuLoad / cpus.length).toFixed(1)
    return cpuLoad
  } 
  
  gpuLoad (gpus) {
    if (gpus == undefined || gpus.length == 0) {
      return '-'
    }
    let gpuLoad = 0
    let totalMem = 0
    gpus.forEach((gpu) => {
      totalMem += parseInt(gpu.fb_memory_total.split('MiB')[0])
      gpuLoad += parseInt(gpu.fb_memory_usage.split('MiB')[0])
    })
    gpuLoad = (gpuLoad / totalMem * 100).toFixed(1)
    return gpuLoad
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
      function millisToMinutesAndSeconds(millis) {
          let minutes = Math.floor(millis / 60000)
          let seconds = ((millis % 60000) / 1000).toFixed(0)
          if (minutes > 60) {
              let hours = (minutes / 60).toFixed(0)
              if (hours > 24) {
                  return (hours / 24).toFixed(0) + 'd ago'
              } else {
                  return hours + 'h ago'
              }
          } else {
              if (seconds < 20 && minutes == 0) {
                return 'now'
              } else {
                return minutes + ":" + (seconds < 10 ? '0' : '') + seconds + 'm ago';  
              }
          }
      }

      return {
          kind: res.kind,
          group: res.metadata.group,
          name: res.metadata.name,
          zone: res.spec.zone,
          product_name: res.spec.product_name,
          address: res.spec.address.map((a) => {return a}),
          allow: res.spec.allow,
          cpus: res.properties.cpu.length,
          cpusLoad: this.cpuLoad(res.properties.cpu) + '%',
          mem:  res.properties.sys != undefined ? (res.properties.sys.mem.total / (1000000000 * (1024.0 / 1000))).toFixed(0) + ' GiB' : null,
          memLoad: res.properties.sys != undefined ? (res.properties.sys.mem.active / res.properties.sys.mem.total * 100).toFixed(1) + '%' : null,
          gpus: res.properties.gpu.length,
          gpusLoad: this.gpuLoad(res.properties.gpu) + '%',
          version: res.properties.version,
          lastSeen: res.lastSeen !== undefined ? millisToMinutesAndSeconds(new Date() - res.lastSeen): '*****',
          wants: res.wants || null,
          status: res.currentStatus,
      }
  }
} 