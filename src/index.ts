import axios from 'axios'
import { createHash } from 'crypto'
import { Connection, Keypair, PublicKey } from '@_koi/web3.js'
import Datastore from 'nedb-promises'
import { promises as fsPromises } from 'fs'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import express from 'express'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import { Document } from './types'

dotenv.config()

const TASK_NAME: string = process.argv[2] || 'Local'
const TASK_ID: string | undefined = process.argv[3]
const EXPRESS_PORT: number = parseInt(process.argv[4], 10) || 10000
const MAIN_ACCOUNT_PUBKEY: string = process.argv[6] || ''
const SECRET_KEY: string = process.argv[7] || ''
const K2_NODE_URL: string = process.argv[8] || '"https://testnet.koii.network"'
const SERVICE_URL: string = process.argv[9] || ''
const STAKE: number = parseFloat(process.argv[10]) || 0
const TASK_NODE_PORT: number = parseInt(process.argv[11], 10) || 0

const app = express()

console.log('SETTING UP EXPRESS')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Allow-Credentials', 'false')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  next()
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const _server = app.listen(EXPRESS_PORT, () => {
  console.log(`${TASK_NAME} listening on port ${EXPRESS_PORT}`)
})

const taskNodeAdministered: boolean = !!TASK_ID
const BASE_ROOT_URL: string = `http://localhost:${TASK_NODE_PORT}/namespace-wrapper`

let connection: Connection

class NamespaceWrapper {
  //public db: Datastore<Document> | null = null

  #db: any
  #testingMainSystemAccount: Keypair | null = null
  #testingStakingSystemAccount: Keypair | null = null
  #testingDistributionList: any = null
  #testingTaskState: any = null

  constructor() {
    if (taskNodeAdministered) {
      this.initializeDB()
    } else {
      this.#db = Datastore.create('./localKOIIDB.db')
      this.defaultTaskSetup()
    }
  }

  public async initializeDB(): Promise<void> {
    if (this.#db) return
    try {
      if (taskNodeAdministered) {
        const path = await this.getTaskLevelDBPath()
        this.#db = Datastore.create(path)
      } else {
        this.#db = Datastore.create('./localKOIIDB.db')
      }
    } catch (e) {
      this.#db = Datastore.create(`../namespace/${TASK_ID}/KOIILevelDB.db`)
    }
  }

  async getDb(): Promise<Datastore<Document>> {
    if (this.#db) return this.#db
    await this.initializeDB()
    return this.#db!
  }

  /**
   * Namespace wrapper of storeGetAsync
   * @param {string} key // Path to get
   * @returns {Promise<*>} Promise containing data
   */
  async storeGet(key: string): Promise<string | null> {
    try {
      await this.initializeDB()
      const resp = await this.#db.findOne({ key: key })
      if (resp) {
        return resp[key]
      } else {
        return null
      }
    } catch (e) {
      console.error(e)
      return null
    }
  }

  /**
   * Namespace wrapper over storeSetAsync
   * @param {string} key Path to set
   * @param {*} value Data to set
   * @returns {Promise<void>}
   */
  async storeSet(key: string, value: string): Promise<void> {
    try {
      await this.initializeDB()
      await this.#db.update(
        { key: key },
        { [key]: value, key },
        { upsert: true },
      )
    } catch (e) {
      console.error(e)
      return undefined
    }
  }

  async getRpcUrl(): Promise<string> {
    // Implement this method based on your application logic
    return K2_NODE_URL
  }

  async getTaskLevelDBPath(): Promise<string> {
    // Implement this method based on your application logic
    return 'path/to/leveldb'
  }

  async defaultTaskSetup() {
    if (taskNodeAdministered) {
      return await genericHandler('defaultTaskSetup')
    } else {
      if (this.#testingTaskState) return Promise.resolve()
      this.#testingMainSystemAccount = new Keypair()
      this.#testingStakingSystemAccount = new Keypair()
      this.#testingDistributionList = {}
      this.#testingTaskState = {
        task_name: 'DummyTestState',
        task_description: 'Dummy Task state for testing flow',
        submissions: {},
        submissions_audit_trigger: {},
        total_bounty_amount: 10000000000,
        bounty_amount_per_round: 1000000000,
        total_stake_amount: 50000000000,
        minimum_stake_amount: 5000000000,
        available_balances: {},
        stake_list: {},
        round_time: 600,
        starting_slot: 0,
        audit_window: 200,
        submission_window: 200,
        distribution_rewards_submission: {},
        distributions_audit_trigger: {},
      }
    }
  }
}

async function genericHandler(...args: string[]) {
  try {
    const response = await axios.post(BASE_ROOT_URL, {
      args,
      taskId: TASK_ID,
      secret: SECRET_KEY,
    })
    if (response.status == 200) return response.data.response
    else {
      console.error(response.status, response.data)
      return null
    }
  } catch (err: any) {
    console.error(`Error in genericHandler: "${args[0]}"`, err.message)
    console.error(err?.response?.data)
    return { error: err }
  }
}
const namespaceWrapper = new NamespaceWrapper()

if (taskNodeAdministered) {
  namespaceWrapper.getRpcUrl().then((rpcUrl) => {
    console.log(rpcUrl, 'RPC URL')
    connection = new Connection(rpcUrl, 'confirmed')
  })
}

export {
  namespaceWrapper,
  taskNodeAdministered,
  app,
  TASK_ID,
  MAIN_ACCOUNT_PUBKEY,
  SECRET_KEY,
  K2_NODE_URL,
  SERVICE_URL,
  STAKE,
  TASK_NODE_PORT,
  _server,
}
