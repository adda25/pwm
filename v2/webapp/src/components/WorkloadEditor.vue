<template>
  <v-card v-if="workload !== null">
        <v-toolbar
          dark
          dense
          class="elevation-0"
        >
          <v-toolbar-title class="text-h5">
            <v-icon small class="mr-3">
              fas fa-box
            </v-icon>      
            Workload <b class="text-h5 font-weight-light ml-2">{{templateWorkload.metadata.name}}</b> 
            <v-icon small class="mr-2 ml-4">fa-list-ol</v-icon> Zone: {{workload.zone}}<v-icon small class="mr-2 ml-3"> fa-layer-group</v-icon> Workspace: {{templateWorkload.metadata.workspace}}
          </v-toolbar-title>
          <v-spacer />
          <v-btn class="primary--text" text @click="deleteWk()" v-if="isToUpdate == true">Delete </v-btn>      
          <v-btn class="blue--text" text @click="updateWk()" v-if="isToUpdate == true">Update </v-btn>
          <v-btn class="warning--text" text @click="updateWk()" v-else>Create </v-btn>              
          <v-btn
            icon
            dark
            @click="closeDialog()"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>

          <template v-slot:extension>
            <v-tabs
              v-model="tabContainer"
              centered
              dark
              icons-and-text
            >
              <v-tabs-slider></v-tabs-slider>

              <v-tab>
                Resource
                <v-icon>fab fa-docker</v-icon>
              </v-tab> 
              <v-divider
                class="mx-4"
                vertical
              ></v-divider>      
              <v-tab>
                Versions
                <v-icon>mdi-account-box</v-icon>
              </v-tab>                              
              <v-tab>
                Log
                <v-icon>mdi-account-box</v-icon>
              </v-tab>    
              <v-tab>
                Webhook
                <v-icon>fab fa-github</v-icon>
              </v-tab>                                  
            </v-tabs>
          </template>


        </v-toolbar>    
    <v-tabs vertical v-if="tabContainer == 0">
      <v-tab>
        <v-icon left>fab fa-docker</v-icon>
        Container
      </v-tab>
      <v-tab>
        <v-icon left>
          fas fa-brain
        </v-icon>
        Hardware
      </v-tab>
      <v-tab>
        <v-icon left>
          fa-hdd
        </v-icon>
        Data sync
      </v-tab>
      <v-tab>
        <v-icon left>
          fas fa-sliders-h
        </v-icon>
        Scheduler
      </v-tab>

      <v-tab-item class="pl-6 pt-0 mt-0">
        <!-- Container -->
        <div class="row">
          <div class="col-lg-4 col-12 pt-0 pb-0" v-if="isToUpdate == false">
            <v-card-title class="overline pl-0">Workload  Name</v-card-title>
              <v-text-field
                v-model="templateWorkload.metadata.name"
                label="Name"
                dense
                outlined
              ></v-text-field>
          </div>     
          <div class="col-lg-12 col-12 pt-0 pb-0">
            <v-card-title class="overline pl-0"> Workload instances </v-card-title>
          </div>
          <div class="col-lg-4 col-12">
              <v-text-field
                v-model="templateWorkload.spec.replica.count"
                label="Number of instances"
                dense
                outlined
              ></v-text-field>
          </div>             
          <div class="col-lg-12 col-12 pt-0 pb-0">
            <v-card-title class="overline pl-0"> Container image options </v-card-title>
          </div>
          <div class="col-lg-6 col-12">
              <v-text-field
                v-model="templateWorkload.spec.image.image"
                label="Base image"
                dense
                outlined
              ></v-text-field>
          </div>
          <div class="col-lg-6 col-12">
              <v-select 
                :items="['IfNotPresent', 'Always']"
                v-model="templateWorkload.spec.image.pullPolicy"
                label="Pull policy"
                outlined
                dense
              ></v-select>
          </div>      
          <div class="col-lg-12 col-12" >
              <v-text-field
              v-model="templateWorkload.spec.config.cmd"
                label="Start containers with"
                dense
                outlined
              ></v-text-field>
          </div>              
          <!--<div class="col-lg-12 col-12" >
              <v-text-field  v-for="n in parseInt(templateWorkload.spec.replica.count)" :key=n
              v-model="templateWorkload.spec.config.cmd"
                :label="'Override instance ' + n  + ' start command with:'"
                dense
                outlined
              ></v-text-field>
          </div>-->

          </div>
      </v-tab-item>


      <!-- Hardware -->
      <v-tab-item class="pl-6 pt-0 mt-0">
          <div class="row">
          <div class="col-lg-12 col-12 pt-0 pb-0">
            <v-card-title class="overline pl-0"> Resources </v-card-title>
          </div>
        
          <div class="col-lg-4 col-12 pt-0 pb-0" v-if="gpuSupport == true && resources.gpus !== undefined">
              <v-select 
                :items="['All'].concat(resources.gpus)"
                v-model="templateWorkload.spec.selectors.gpu.product_name"
                label="GPU Model"
                outlined
                dense
              ></v-select>
          </div>
          <div class="col-lg-4 col-12 pt-0 pb-0" v-if="gpuSupport == true && resources.gpus !== undefined">
            <v-text-field
                label="Count"
                v-model="templateWorkload.spec.selectors.gpu.count"
                hide-details="auto"
                outlined
                dense
            ></v-text-field>
          </div>
          <div class="col-lg-4 col-12 pt-0 pb-0" v-if="gpuSupport == true && resources.gpus !== undefined">
            <v-switch
              v-model="gpuSupport"
              :label="`Attach GPU`"
              dense
              style="margin-top: -5px"
            ></v-switch>
          </div>
         <div class="col-lg-4 col-12 pt-0 pb-0" v-if="gpuSupport == false && resources.cpus !== undefined">
              <v-select 
                :items="['All'].concat(resources.cpus)"
                v-model="templateWorkload.spec.selectors.cpu.product_name"
                label="CPU Model"
                outlined
                dense
              ></v-select>
          </div>
          <div class="col-lg-4 col-12 pt-0 pb-0" v-if="gpuSupport == false && resources.cpus !== undefined">
            <v-text-field
                label="Count"
                v-model="templateWorkload.spec.selectors.cpu.count"
                hide-details="auto"
                outlined
                dense
            ></v-text-field>
          </div>
          <div class="col-lg-4 col-12 pt-0 pb-0" v-if="gpuSupport == false && resources.cpus !== undefined">
            <v-switch
              v-model="gpuSupport"
              :label="`Attach GPU`"
              dense
              style="margin-top: -5px"
            ></v-switch>
          </div>
          </div>        
      </v-tab-item>

      <!-- Data Sync -->
      <v-tab-item class="pl-6 pt-0 mt-0">
        <!-- Volumes -->
        <v-card-title class="overline pl-0"> Attached Volumes </v-card-title>
        <v-select 
          :items="resources.volumes"
          v-model="temp.volumes"
          item-text="groupname"
          item-value="groupname"
          label="Volumes"
          outlined
          multiple
          dense
        ></v-select>    
        <!-- Sync -->
        <v-card class="elevation-0">
          <v-card-title class="overline pl-0"> Sync folders </v-card-title>
          <v-card-subtitle class="pa-0"> Sync file and folders in real-time from your PC to Dora volumes </v-card-subtitle>

          <v-card-text class="pt-4" v-if="$store.state.isElectron == false">
            <h3> Sync modification is available only in the Desktop app </h3> 
          </v-card-text>
          <v-card-text class="pt-4">
            {{syncFolders}}
            <div v-for="(s, index) in syncFolders" :key="index" @ref="syncFolders.length" class="pa-0 pt-2">
            <v-row>
              <v-col class="col-4">
                <v-text-field dense :disabled="$store.state.isElectron == false" outlined v-model="s.src" label="Local path"></v-text-field>
              </v-col> 
              <v-col class="col-3">
                <v-select dense :disabled="$store.state.isElectron == false" outlined v-model="s.volume" label="Volume" :items="resources.volumes" item-text="groupname" item-value="groupname"></v-select>
              </v-col> 
              <v-col class="col-3">
                <v-text-field dense :disabled="$store.state.isElectron == false" outlined v-model="s.dst" label="Remote path"></v-text-field>
              </v-col>               
              <v-col class="col-1">
                <v-checkbox dense :disabled="$store.state.isElectron == false" outlined v-model="s.active" label="Active"></v-checkbox>
              </v-col>                             
            </v-row>
          </div>
          </v-card-text>

          <v-card-actions>
            <v-btn text @click="addSync"> Add sync </v-btn>
          </v-card-actions>
        </v-card>
      </v-tab-item>

      <!-- Scheduler -->
      <v-tab-item class="pl-6 pt-0 mt-0">
          <div class="row">
          <div class="col-lg-12 col-12 pt-0 pb-0">
            <v-card-title class="overline pl-0"> Config </v-card-title>
          </div>

          <div class="col-lg-4 col-12 pt-0 pb-0">
            <v-select 
              :items="['Random', 'FanOut', 'SameNode']"
              v-model="templateWorkload.spec.config.affinity"
              label="Node affinity"
              outlined
              dense
            ></v-select>  
          </div>
          <div class="col-lg-6 col-12 pt-0 pb-0">
            <v-select 
              :items="['Never', 'Always']"
              v-model="templateWorkload.spec.config.restartPolicy"
              label="Restart policy"
              outlined
              dense
            ></v-select>
          </div>
          </div>

      </v-tab-item>

    </v-tabs>
    <div v-if="tabContainer == 3">
      <v-card class="elevation-0">
      <v-card-title><h3>GitHub Integration</h3></v-card-title>
      <v-card-subtitle>Add actions linked with you repo</v-card-subtitle>
      <v-card-text>
        <div v-for="(webhook, index) in githubWebhookIntegrations" @key="index" @ref="templateWorkload.meta.integrations.github.webhooks.length">
          <v-row class="pt-0 mt-0">
            <v-col class="col-3">
              <v-text-field outlined dense v-model="webhook.path" placeholder="Path" persistent-hint :hint="$store.state.apiServer + '/v1/igw/' + workload.workspace + '/' + workload.name + '/' + webhook.path"></v-text-field>
            </v-col>
            <v-col class="col-3">
              <v-text-field outlined dense v-model="webhook.secret" placeholder="Secret"></v-text-field>
            </v-col>
            <v-col class="col-3">
              <v-select outlined dense v-model="webhook.requestedAction" placeholder="Action" :items="['ScaleUp', 'ScaleDown', 'Stop', 'Logs']"></v-select>
            </v-col>  
            <v-col class="col-1 pt-4">
              <v-btn small icon @click="removeWebhookAt(index)"><v-icon>fa fa-trash</v-icon></v-btn>
            </v-col>      
            <v-col class="col-1 pt-0">
              <v-checkbox  v-model="webhook.active" label="Active"></v-checkbox>
            </v-col>                                     
          </v-row>                   
        </div>
        <v-btn text @click="addWebhook"> Add webhook </v-btn>  
      </v-card-text>
      </v-card>
    </div>

    <v-card-text v-if="workload.status == 'failed' && workload.reason !== null">
      {{workload.reason}}
    </v-card-text>
    <v-card-subtitle class="text-h6 font-weight-bold pb-0 mb-0" v-if="workload.image !== undefined && workload.image !== null && workload.image !== ''">
    </v-card-subtitle>

  </v-card>
</template>
<script type="text/javascript">

import anifunny from 'anifunny'
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator'
import yaml from 'js-yaml'
import _ from 'lodash'

function generateName () {
  //return anifunny.generate()
  return uniqueNamesGenerator({
    dictionaries: [adjectives, colors ], 
    length: 2,
    separator: '.'
  })
}

export default {
  name: 'WorkloadEditor',
  props: ['_workload', 'keywwk'],
  components: {  },
  data: function () {
    return {
      isToUpdate: false,
      workload: null,

      resources: {},

      gpuSupport: true,

      tabContainer: 0,

      templateWorkload: {},

      temp: {
        volumes: []
      }
    }
  },
  watch: {

  },
  computed: {
    githubWebhookIntegrations () {
      return this.templateWorkload.meta.integrations.github.webhooks
    },  
    syncFolders () {
      return this.templateWorkload.spec.sync
    } 
  },
  methods: {
    addSync () {
      this.templateWorkload.spec.sync.push({src: '', volume: '', dst: '', active: true})
    },
    addWebhook () {
      this.templateWorkload.meta.integrations.github.webhooks.push({
        path: '',
        secret: '',
        requestedAction: 'ScaleUp',
        active: true
      })
    },
    removeWebhookAt (index) {
      this.templateWorkload.meta.integrations.github.webhooks.splice(index, 1)
    },
    closeDialog () {
      this.$emit('close-dialog')
    },
    updateWk () {
      if (this.gpuSupport == true) {
        delete this.templateWorkload.spec.selectors.cpu
      } else {
        delete this.templateWorkload.spec.selectors.gpu
      }
      this.templateWorkload.spec.volumes = this.resources.volumes.filter((v) => {
        let codevol = v.workspace + '.' + v.name
        console.log(this.temp.volumes, codevol)
        if (this.temp.volumes.includes(codevol)) {
          return true
        } else {
          return false
        }
      })
      this.$store.dispatch('apply', this.templateWorkload)
    },

    fetch () {
      if (this.isToUpdate == true) {
        this.$store.dispatch('describe', {name: this.workload.name, workspace: this.workload.workspace, kind: 'Workload', cb: function (data) {
          if (data.length == 1) {
            let wk = data[0]
            this.templateWorkload.meta = wk.meta
            this.templateWorkload.metadata = {name: wk.name, workspace: wk.workspace}
            this.templateWorkload.spec = wk.resource

            if (this.templateWorkload.spec.sync == undefined) {
              this.templateWorkload.spec.sync = []
            }

            this.temp.volumes = wk.resource.volumes.map((v) => {
              return v.workspace + '.' + v.name
            })       
            
            if (this.templateWorkload.spec.selectors.gpu == undefined) {
              this.templateWorkload.spec.selectors.gpu = {product_name: 'All', count: 1}
            }
            if (this.templateWorkload.spec.selectors.cpu == undefined) {
              this.templateWorkload.spec.selectors.cpu = {product_name: 'All', count: 1}
            } else {
              this.gpuSupport = false
            }
            if (this.templateWorkload.spec.image.pullPolicy == undefined) {
              this.templateWorkload.spec.image.pullPolicy = 'IfNotPresent'
            }
            if (this.templateWorkload.spec.config.restartPolicy == undefined) {
              this.templateWorkload.spec.config.restartPolicy = 'Never'
            }
            if (this.templateWorkload.spec.config.cmd == undefined) {
              this.templateWorkload.spec.config.cmd = '/bin/bash'
            }
            if (this.templateWorkload.spec.config.affinity == undefined) {
              this.templateWorkload.spec.config.affinity = 'Random'
            }   
            if (this.templateWorkload.meta == null) {
              this.templateWorkload.meta = {}
            } 
            if (this.templateWorkload.meta.integrations == undefined || this.templateWorkload.meta.integrations.github == undefined || this.templateWorkload.meta.integrations.github.webhooks == undefined) {
              this.templateWorkload.meta.integrations = {github: {webhooks: []}} 
            }    
          }
        }.bind(this)})         
      }
    },
    deleteWk () {
      this.$store.dispatch('delete', {
        kind: 'Workload',
        name: this.workload.name,
        workspace: this.workload.workspace,
      })
    },    
    fetchResources (cb) {
      this.$store.dispatch('resource', {name: 'GPU', cb: function (datagpu) {
        this.resources.gpus = [...new Set(datagpu.map((gpu) => { return gpu.product_name}) )]
      
        this.$store.dispatch('resource', {name: 'CPU', cb: function (datacpu) {
          this.resources.cpus = [...new Set(datacpu.map((cpu) => { return cpu.product_name}) )]
      
          this.$store.dispatch('resource', {name: 'Storage', cb: function (datastore) {
            this.resources.storages = datastore.map((storage) => {return storage.name})
          
            this.$store.dispatch('resource', {name: 'Volume', cb: function (datavol, index) {
              this.resources.volumes = datavol.map((volume) => {return {name: volume.name, storage: volume.storage, target: '/' + volume.name, workspace: volume.workspace, group: volume.workspace, _vol: index, groupname: volume.workspace + '.' + volume.name}})
              cb()
            }.bind(this)}) 
          }.bind(this)})      
        }.bind(this)}) 
      }.bind(this)})  
    }
  },
  mounted () {
    this.fetchResources(function () {
      if (this._workload !== undefined && this._workload !== null) {
        this.isToUpdate = true
        this.workload = JSON.parse(JSON.stringify(this._workload))
        this.fetch() 
      } else {
        this.workload = {
          name: this.templateWorkload.metadata.name,
          workspace: this.templateWorkload.metadata.workspace,
        }
      }
    }.bind(this))
  },
  beforeMount () {
    this.templateWorkload = {
      kind: 'Workload',
      metadata: {
        name: generateName(),
        workspace: this.$store.state.selectedWorkspace,
        zone: this.$store.state.selectedZone,
      },
      meta: {
        integrations: {
          github: {
            webhooks: []
          }
        }
      },
      spec: {
        replica: {
          count: 0
        },
        driver: 'Docker',
        selectors: {
          gpu: {
            product_name: 'All',
            count: 1
          },
          cpu: {
            product_name: 'All',
            count: 1
          }
        },
        image: {
          image: 'ubuntu',
          pullPolicy: 'IfNotPresent'
        },
        config: {
          cmd: '/bin/bash',
          restartPolicy: 'Never',
          affinity: 'Random'
        },
        volumes: [],
        sync: []
      }
    }

  }  
}
</script>
