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
import {
  GenericHandlerResponse,
  TaskState,
  TaskNode,
  TaskSubmissionState,
} from './types'

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
        round,
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

  async getTaskState(options: any): Promise<TaskState | null> {
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
        task_id: '',
        task_name: 'DummyTestState',
        task_manager: '',
        is_allowlisted: false,
        is_active: false,
        task_audit_program: 'test',
        stake_pot_account: '',
        total_bounty_amount: 10000000000,
        bounty_amount_per_round: 1000000000,
        current_round: 0,
        available_balances: {},
        stake_list: {},
        task_metadata: 'test',
        task_description: 'Dummy Task state for testing flow',
        submissions: {},
        submissions_audit_trigger: {},
        total_stake_amount: 50000000000,
        minimum_stake_amount: 5000000000,
        ip_address_list: {},
        round_time: 600,
        starting_slot: 0,
        audit_window: 200,
        submission_window: 200,
        task_executable_network: 'IPFS',
        distribution_rewards_submission: {},
        distributions_audit_trigger: {},
        distributions_audit_record: {},
        task_vars: 'test',
        koii_vars: 'test',
        is_migrated: false,
        migrated_to: '',
        allowed_failed_distributions: 0,
      }
    }
  }

  async getTaskSubmissionInfo(
    round: number,
  ): Promise<TaskSubmissionState | null> {
    if (taskNodeAdministered) {
      const taskSubmissionInfo = await genericHandler(
        'getTaskSubmissionInfo',
        round,
      )
      if (
        typeof taskSubmissionInfo === 'object' &&
        'error' in taskSubmissionInfo
      ) {
        return null
      }
      return taskSubmissionInfo
    } else {
      return this.testingTaskState
    }
  }

  async getSubmitterAccount(): Promise<Keypair | null> {
    if (taskNodeAdministered) {
      const submitterAccountResp = await genericHandler('getSubmitterAccount')
      return Keypair.fromSecretKey(
        Uint8Array.from(Object.values(submitterAccountResp._keypair.secretKey)),
      )
    } else {
      return this.testingStakingSystemAccount
    }
  }

  async auditSubmission(
    candidatePubkey: PublicKey,
    isValid: boolean,
    voterKeypair: Keypair,
    round: number,
  ): Promise<void> {
    if (taskNodeAdministered) {
      await genericHandler('auditSubmission', candidatePubkey, isValid, round)
    } else {
      if (
        this.testingTaskState!.submissions_audit_trigger[round] &&
        this.testingTaskState!.submissions_audit_trigger[round][
          candidatePubkey.toBase58()
        ]
      ) {
        this.testingTaskState!.submissions_audit_trigger[round][
          candidatePubkey.toBase58()
        ].votes.push({
          is_valid: isValid,
          voter: voterKeypair.publicKey,
          slot: 100,
        })
      } else {
        this.testingTaskState!.submissions_audit_trigger[round] = {
          [candidatePubkey.toBase58()]: {
            trigger_by: this.testingStakingSystemAccount!.publicKey,
            slot: 100,
            votes: [],
          },
        }
      }
    }
  }

  async validateAndVoteOnNodes(
    validate: (submissionValue: string, round: number) => Promise<boolean>,
    round: number,
  ): Promise<void | string> {
    console.log('******/  IN VOTING /******')
    let taskAccountDataJSON: TaskSubmissionState | null = null
    try {
      taskAccountDataJSON = await this.getTaskSubmissionInfo(round)
    } catch (error) {
      console.error('Error in getting submissions for the round', error)
    }
    if (taskAccountDataJSON == null) {
      console.log('No submissions found for the round', round)
      return
    }
    console.log(
      `Fetching the submissions of round ${round}`,
      taskAccountDataJSON.submissions[round],
    )
    const submissions = taskAccountDataJSON.submissions[round]
    if (submissions == null) {
      console.log(`No submissions found in round ${round}`)
      return `No submissions found in round ${round}`
    } else {
      const keys = Object.keys(submissions)
      const values = Object.values(submissions)
      const size = values.length
      console.log('Submissions from last round: ', keys, values, size)
      let isValid
      const submitterAccountKeyPair = await this.getSubmitterAccount()
      const submitterPubkey = submitterAccountKeyPair!.publicKey.toBase58()
      for (let i = 0; i < size; i++) {
        const candidatePublicKey = keys[i]
        console.log('FOR CANDIDATE KEY', candidatePublicKey)
        const candidateKeyPairPublicKey = new PublicKey(keys[i])
        if (candidatePublicKey === submitterPubkey && taskNodeAdministered) {
          console.log('YOU CANNOT VOTE ON YOUR OWN SUBMISSIONS')
        } else {
          try {
            console.log('SUBMISSION VALUE TO CHECK', values[i].submission_value)
            isValid = await validate(values[i].submission_value, round)
            console.log(`Voting ${isValid} to ${candidatePublicKey}`)

            if (isValid) {
              const submissions_audit_trigger =
                taskAccountDataJSON.submissions_audit_trigger[round]
              console.log('SUBMIT AUDIT TRIGGER', submissions_audit_trigger)
              if (
                submissions_audit_trigger &&
                submissions_audit_trigger[candidatePublicKey]
              ) {
                console.log('VOTING TRUE ON AUDIT')
                const response = await this.auditSubmission(
                  candidateKeyPairPublicKey,
                  isValid,
                  submitterAccountKeyPair!,
                  round,
                )
                console.log('RESPONSE FROM AUDIT FUNCTION', response)
              }
            } else if (isValid === false) {
              console.log('RAISING AUDIT / VOTING FALSE')
              const response = await this.auditSubmission(
                candidateKeyPairPublicKey,
                isValid,
                submitterAccountKeyPair!,
                round,
              )
              console.log('RESPONSE FROM AUDIT FUNCTION', response)
            }
          } catch (err) {
            console.log('ERROR IN ELSE CONDITION', err)
          }
        }
      }
    }
  }

  async distributionListSubmissionOnChain(
    round: number,
  ): Promise<void | string> {
    if (taskNodeAdministered) {
      return await genericHandler('distributionListSubmissionOnChain', round)
    } else {
      if (!this.testingTaskState!.distribution_rewards_submission[round]) {
        this.testingTaskState!.distribution_rewards_submission[round] = {}
      }

      this.testingTaskState!.distribution_rewards_submission[round][
        this.testingStakingSystemAccount!.publicKey.toBase58()
      ] = {
        submission_value:
          this.testingStakingSystemAccount!.publicKey.toBase58(),
        slot: 200,
        round: 1,
      }
    }
  }

  async uploadDistributionList(
    distributionList: Record<string, any>,
    round: number,
  ): Promise<boolean | null> {
    if (taskNodeAdministered) {
      return await genericHandler(
        'uploadDistributionList',
        distributionList,
        round,
      )
    } else {
      if (!this.testingDistributionList![round]) {
        this.testingDistributionList![round] = {}
      }

      this.testingDistributionList![round][
        this.testingStakingSystemAccount!.publicKey.toBase58()
      ] = Buffer.from(JSON.stringify(distributionList))
      return true
    }
  }
}

async function genericHandler(...args: any[]): Promise<GenericHandlerResponse> {
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
