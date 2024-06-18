import axios from 'axios'
import { createHash } from 'crypto'
import { Connection, Keypair } from '@_koi/web3.js'
import Datastore from 'nedb-promises'
import { promises as fsPromises } from 'fs'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import express from 'express'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import { GenericHandlerResponse, TaskState, TaskNode } from './types'

dotenv.config()

const TASK_NAME: string = process.argv[2] || 'Local'
const TASK_ID: string | undefined = process.argv[3]
const EXPRESS_PORT: number = parseInt(process.argv[4], 10) || 3000
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

class NamespaceWrapper implements TaskNode {
  private db: Datastore<any> | null = null
  public testingMainSystemAccount: Keypair | null = null
  public testingStakingSystemAccount: Keypair | null = null
  public testingTaskState: TaskState | null = null
  public testingDistributionList: any = null

  constructor() {
    if (taskNodeAdministered) {
      this.initializeDB()
    } else {
      this.db = Datastore.create('./localKOIIDB.db')
      this.defaultTaskSetup()
    }
  }

  public async initializeDB(): Promise<void> {
    if (this.db) return
    try {
      if (taskNodeAdministered) {
        const path = await this.getTaskLevelDBPath()
        this.db = Datastore.create(path)
      } else {
        this.db = Datastore.create('./localKOIIDB.db')
      }
    } catch (e) {
      this.db = Datastore.create(`../namespace/${TASK_ID}/KOIILevelDB.db`)
    }
  }

  async getDb(): Promise<Datastore<any>> {
    if (this.db) return this.db
    await this.initializeDB()
    return this.db!
  }

  async storeGet(key: string): Promise<string | null> {
    try {
      await this.initializeDB()
      const resp = await this.db!.findOne({ key })
      return resp ? resp[key] : null
    } catch (e) {
      console.error(e)
      return null
    }
  }

  async storeSet(key: string, value: string): Promise<void> {
    try {
      await this.initializeDB()
      await this.db!.update({ key }, { [key]: value, key }, { upsert: true })
    } catch (e) {
      console.error(e)
      return undefined
    }
  }

  async getSlot(): Promise<number> {
    if (taskNodeAdministered) {
      const response = await genericHandler('getCurrentSlot')
      if (typeof response === 'number') {
        return response
      } else {
        console.error('Error getting slot:', response)
        return 0 // or handle error appropriately
      }
    } else {
      return 100
    }
  }

  async checkSubmissionAndUpdateRound(
    submissionValue: string = 'default',
    round: number,
  ): Promise<void> {
    if (taskNodeAdministered) {
      await genericHandler(
        'checkSubmissionAndUpdateRound',
        submissionValue,
        round.toString(),
      )
    } else {
      if (!this.testingTaskState!.submissions[round]) {
        this.testingTaskState!.submissions[round] = {}
      }
      this.testingTaskState!.submissions[round][
        this.testingStakingSystemAccount!.publicKey.toBase58()
      ] = {
        submission_value: submissionValue,
        slot: 100,
        round,
      }
    }
  }

  async getTaskState(options: any): Promise<any> {
    if (taskNodeAdministered) {
      const response = await genericHandler('getTaskState', options)
      if (typeof response === 'number') {
        // Handle error response (numbers)
        console.log('Error in getting task state', response)
        return null
      } else {
        // Handle successful response
        return response
      }
    } else {
      return this.testingTaskState
    }
  }

  async getRpcUrl(): Promise<string> {
    return K2_NODE_URL
  }

  async getTaskLevelDBPath(): Promise<string> {
    return 'path/to/leveldb'
  }

  async defaultTaskSetup(): Promise<void> {
    if (taskNodeAdministered) {
      await genericHandler('defaultTaskSetup')
    } else {
      if (this.testingTaskState) return
      this.testingMainSystemAccount = new Keypair()
      this.testingStakingSystemAccount = new Keypair()
      this.testingDistributionList = {}
      this.testingTaskState = {
        submissions: {},
      }
    }
  }
}

async function genericHandler(
  ...args: string[]
): Promise<GenericHandlerResponse> {
  try {
    const response = await axios.post(BASE_ROOT_URL, {
      args,
      taskId: TASK_ID,
      secret: SECRET_KEY,
    })
    if (response.status === 200) {
      return response.data.response
    } else {
      console.error(response.status, response.data)
      return { error: response.data }
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
