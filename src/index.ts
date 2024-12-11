import axios from 'axios'
import { createHash } from 'crypto'
import crypto from 'crypto'
import { Transaction, Connection, Keypair, PublicKey } from '@_koii/web3.js'
import Datastore from 'nedb-promises'
import {
  promises as fsPromises,
  createWriteStream,
  WriteStream,
  readFileSync,
} from 'fs'
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
  TaskDistributionInfo,
  LogLevel,
  TaskStateOptions,
  TaskType,
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

app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }))
app.use(bodyParser.json({ limit: '50mb' }))

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
  res.json({ status: 200, message: 'Running' })
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

  async fs(
    method: keyof typeof fsPromises,
    path: string,
    ...args: any[]
  ): Promise<any> {
    if (taskNodeAdministered) {
      return await genericHandler('fs', method, path, ...args)
    } else {
      const fsMethod = fsPromises[method] as (...args: any[]) => Promise<any>
      return fsMethod(path, ...args)
    }
  }

  async fsStaking(
    method: keyof typeof fsPromises,
    path: string,
    ...args: any[]
  ): Promise<any> {
    if (taskNodeAdministered) {
      return await genericHandler('fsStaking', method, path, ...args)
    } else {
      const fsMethod = fsPromises[method] as (...args: any[]) => Promise<any>
      return fsMethod(path, ...args)
    }
  }
  async fsWriteStream(imagepath: string): Promise<WriteStream | void> {
    if (taskNodeAdministered) {
      return await genericHandler('fsWriteStream', imagepath)
    } else {
      const writer = createWriteStream(imagepath)
      return writer
    }
  }

  async fsReadStream(imagepath: string): Promise<Buffer | void> {
    if (taskNodeAdministered) {
      return await genericHandler('fsReadStream', imagepath)
    } else {
      const file = readFileSync(imagepath)
      return file
    }
  }

  async payloadSigning(body: Record<string, unknown>): Promise<string | void> {
    if (taskNodeAdministered) {
      return await genericHandler('signData', body)
    } else {
      const msg = new TextEncoder().encode(JSON.stringify(body))
      const signedMessage = nacl.sign(
        msg,
        this.testingMainSystemAccount!.secretKey,
      )
      return await this.bs58Encode(signedMessage)
    }
  }

  async bs58Encode(data: Uint8Array): Promise<string> {
    return bs58.encode(data)
  }

  async bs58Decode(data: string): Promise<Uint8Array> {
    return new Uint8Array(bs58.decode(data))
  }

  decodePayload(payload: Uint8Array): string {
    return new TextDecoder().decode(payload)
  }

  async verifySignature(
    signedMessage: string,
    pubKey: string,
  ): Promise<{ data?: string; error?: string }> {
    if (taskNodeAdministered) {
      return await genericHandler('verifySignedData', signedMessage, pubKey)
    } else {
      try {
        const payload = nacl.sign.open(
          await this.bs58Decode(signedMessage),
          await this.bs58Decode(pubKey),
        )
        if (!payload) return { error: 'Invalid signature' }
        return { data: this.decodePayload(payload) }
      } catch (e) {
        console.error(e)
        return { error: `Verification failed: ${e}` }
      }
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

  async getNodes(url: string) {
    if (taskNodeAdministered) {
      return await genericHandler('getNodes', url)
    } else {
      console.log('Cannot call getNodes in testing mode')
    }
  }

  async getRpcUrl(): Promise<string | void> {
    if (taskNodeAdministered) {
      return await genericHandler('getRpcUrl')
    } else {
      console.log('Cannot call get URL in testing mode')
    }
  }

  async getProgramAccounts() {
    if (taskNodeAdministered) {
      return await genericHandler('getProgramAccounts')
    } else {
      console.log('Cannot call getProgramAccounts in testing mode')
    }
  }

  async sendAndConfirmTransactionWrapper(
    transaction: Transaction,
    signers: Keypair[],
  ): Promise<void | string> {
    if (taskNodeAdministered) {
      console.log('Cannot call sendTransaction in testing mode')
      return
    }
    const blockhash = (await connection.getRecentBlockhash('finalized'))
      .blockhash
    transaction.recentBlockhash = blockhash
    transaction.feePayer = new PublicKey(MAIN_ACCOUNT_PUBKEY)
    return await genericHandler(
      'sendAndConfirmTransactionWrapper',
      transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }),
      signers,
    )
  }

  async sendTransaction(
    serviceNodeAccount: PublicKey,
    beneficiaryAccount: PublicKey,
    amount: number,
  ): Promise<void | string> {
    if (!taskNodeAdministered) {
      console.log('Cannot call sendTransaction in testing mode')
      return
    }
    return await genericHandler(
      'sendTransaction',
      serviceNodeAccount,
      beneficiaryAccount,
      amount,
    )
  }

  async claimReward(
    stakePotAccount: PublicKey,
    beneficiaryAccount: PublicKey,
    claimerKeypair: Keypair,
  ): Promise<void> {
    if (taskNodeAdministered) {
      console.log('Cannot call sendTransaction in testing mode')
      return
    }
    return await genericHandler(
      'claimReward',
      stakePotAccount,
      beneficiaryAccount,
      claimerKeypair,
    )
  }

  async stakeOnChain(
    taskStateInfoPublicKey: PublicKey,
    stakingAccKeypair: Keypair,
    stakePotAccount: PublicKey,
    stakeAmount: number,
  ): Promise<void | string> {
    if (taskNodeAdministered) {
      return await genericHandler(
        'stakeOnChain',
        taskStateInfoPublicKey,
        stakingAccKeypair,
        stakePotAccount,
        stakeAmount,
      )
    } else {
      this.testingTaskState!.stake_list[
        this.testingStakingSystemAccount!.publicKey.toBase58()
      ] = stakeAmount
      this.testingTaskState!.ip_address_list[
        this.testingStakingSystemAccount!.publicKey.toBase58()
      ] = 'http://127.0.0.1:3000'
    }
  }

  async logMessage(
    level: LogLevel,
    message: string,
    action: string,
  ): Promise<boolean> {
    switch (level) {
      case LogLevel.Log:
        console.log(message, action)
        break
      case LogLevel.Warn:
        console.warn(message, action)
        break
      case LogLevel.Error:
        console.error(message, action)
        break
      default:
        console.log(
          `Invalid log level: ${level}. The log levels can be log, warn or error`,
        )
        return false
    }
    return true
  }

  /**
   * This logger function is used to log the task erros , warnings and logs on desktop-node
   * @param {level} enum // Receive method ["Log", "Warn", "Error"]
   enum LogLevel {
   Log = 'log',
   Warn = 'warn',
   Error = 'error',
   }
   * @param {message} string // log, error or warning message
   * @returns {boolean} // true if the message is logged successfully otherwise false
   */

  async logger(
    level: LogLevel,
    message: string,
    action: string,
  ): Promise<boolean> {
    if (taskNodeAdministered) {
      return await genericHandler('logger', level, message, action)
    } else {
      return await this.logMessage(level, message, action)
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

  async getTaskState(options: TaskStateOptions): Promise<TaskState | null> {
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
  async getTaskStateById(
    taskId: string,
    task_type: TaskType,
    options: TaskStateOptions,
  ): Promise<TaskState | null> {
    if (taskNodeAdministered) {
      const response = await genericHandler(
        'getTaskStateById',
        taskId,
        options,
        task_type,
      )
      if (typeof response === 'number') {
        // Handle error response (numbers)
        console.error('Error in getting task state', response)
        return null
      } else {
        // Handle successful response
        return response
      }
    } else {
      // get task state from K2
      const connection = new Connection(
        process.env.K2_URL || 'https://testnet.koii.network',
        'confirmed',
      )
      if (!options) options = {}
      const {
        is_submission_required = false,
        is_distribution_required = false,
        is_available_balances_required = false,
        is_stake_list_required = false,
      } = options
      if (task_type === 'KOII') {
        try {
          const taskAccountInfo = await connection.getTaskAccountInfo(
            new PublicKey(taskId),
            is_submission_required,
            is_distribution_required,
            is_available_balances_required,
            is_stake_list_required,
            'base64',
          )
          if (!taskAccountInfo) {
            console.error('Error getting task account info')
            return null
          }
          return JSON.parse(taskAccountInfo.data.toString('utf-8'))
        } catch (error) {
          console.error('Error in fetching task state', error)
          return null
        }
      } else if (task_type === 'KPL') {
        const bincode_js = await import(
          /* webpackIgnore: true */
          '../webasm_bincode_deserializer/bincode_js'
        )
        const borsh_bpf_js_deserialize = bincode_js.borsh_bpf_js_deserialize
        try {
          const accountInfo = await connection.getAccountInfo(
            new PublicKey(taskId),
          )
          if (!accountInfo) {
            console.error('Error in getting task account info')
            return null
          }
          const buffer = accountInfo.data
          const taskState = borsh_bpf_js_deserialize(buffer)
          return parseTaskState(
            taskState,
            is_submission_required,
            is_distribution_required,
            is_available_balances_required,
            is_stake_list_required,
          )
        } catch (error) {
          console.error('Error in fetching task state', error)
          return null
        }
      } else {
        throw new Error('Task type is required')
      }
    }
  }

  async getTaskLevelDBPath(): Promise<string> {
    if (taskNodeAdministered) {
      return await genericHandler('getTaskLevelDBPath')
    } else {
      return './KOIIDB'
    }
  }

  async getBasePath(): Promise<string> {
    if (taskNodeAdministered) {
      return await genericHandler('getBasePath')
    } else {
      return './'
    }
  }

  async getRound(): Promise<number> {
    if (taskNodeAdministered) {
      return await genericHandler('getRound')
    } else {
      return 1
    }
  }

  async defaultTaskSetup(): Promise<void> {
    if (taskNodeAdministered) {
      await genericHandler('defaultTaskSetup')
    } else {
      if (this.testingTaskState) return
      this.testingMainSystemAccount = new Keypair()
      this.testingStakingSystemAccount = this.getTestingStakingWallet()
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

  async getMainAccountPubkey(): Promise<string | null> {
    if (taskNodeAdministered) {
      return MAIN_ACCOUNT_PUBKEY
    } else {
      return this.testingMainSystemAccount!.publicKey.toBase58()
    }
  }

  async getTaskNodeVersion(): Promise<string> {
    if (taskNodeAdministered) {
      return await genericHandler('getTaskNodeVersion')
    } else {
      return '1.11.19'
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
    validate: (
      submissionValue: string,
      round: number,
      nodePublicKey: string,
    ) => Promise<boolean>,
    round: number,
    useRandomSampling?: boolean,
    uploadToIPFS = false,
  ): Promise<void | string> {
    console.log('******/  IN VOTING /******')
    useRandomSampling = useRandomSampling ?? false
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
    // console.log(
    //   `Fetching the submissions of round ${round}`,
    //   taskAccountDataJSON.submissions[round],
    // )
    const submissions = taskAccountDataJSON.submissions[round]
    if (submissions == null) {
      console.log(`No submissions found in round ${round}`)
      return `No submissions found in round ${round}`
    } else {
      const keys = Object.keys(submissions)
      const values = Object.values(submissions)
      const size = values.length
      console.log('Submissions from last round: ', keys, values, size)

      let indices: number[] = []
      if (useRandomSampling == true) {
        const numberOfChecks = Math.min(5, size)
        let uniqueIndices = new Set<number>()
        while (uniqueIndices.size < numberOfChecks) {
          const randomIndex = Math.floor(Math.random() * size)
          uniqueIndices.add(randomIndex)
        }
        indices = Array.from(uniqueIndices)
      } else {
        indices = Array.from({ length: size }, (_, i) => i)
      }
      const submitterAccountKeyPair = await this.getSubmitterAccount()
      const submitterPubkey = submitterAccountKeyPair!.publicKey.toBase58()

      for (let index of indices) {
        const candidatePublicKey = keys[index]
        console.log('FOR CANDIDATE KEY', candidatePublicKey)

        const candidateKeyPairPublicKey = new PublicKey(candidatePublicKey)
        if (candidatePublicKey === submitterPubkey && taskNodeAdministered) {
          console.log('YOU CANNOT VOTE ON YOUR OWN SUBMISSIONS')
          continue
        }
        try {
          console.log(
            'SUBMISSION VALUE TO CHECK',
            values[index].submission_value,
          )

          let isValid = false

          if (uploadToIPFS) {
            // call the function to validate signature and get the hash of data

            const cid = values[index].submission_value

            const data = JSON.parse(
              await this.retrieveThroughHttpGateway(
                cid,
                `submissionValues${round}.json`,
              ),
            )

            const receivedHash = await this.verifySignature(
              data.signedMessage,
              candidatePublicKey,
            )

            console.log('Received hash', receivedHash)
            // calculate the hash from the file contents

            const calculatedHash = crypto
              .createHash('sha256')
              .update(data.submission)
              .digest('hex')

            console.log('Calculated hash', calculatedHash)

            // Remove the extra quotes from receivedHash.data
            const normalizedReceivedHash = receivedHash.data?.replace(/"/g, '')

            console.log('Normalized received hash', normalizedReceivedHash)

            //  compare if the calculated hash is equal to the received hash

            if (calculatedHash == normalizedReceivedHash) {
              isValid = await validate(
                data.submission,
                round,
                candidatePublicKey,
              )
              console.log(`Voting ${isValid} to ${candidatePublicKey}`)
            } else {
              console.error('INVALID HASH')
              console.log('RAISING AUDIT / VOTING FALSE')
              const response = await this.auditSubmission(
                candidateKeyPairPublicKey,
                false,
                submitterAccountKeyPair!,
                round,
              )
              console.log('RESPONSE FROM AUDIT FUNCTION', response)
            }
          } else {
            isValid = await validate(
              values[index].submission_value,
              round,
              candidatePublicKey,
            )
            console.log(`Voting ${isValid} to ${candidatePublicKey}`)
          }

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
          } else {
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

  fetchWithTimeout = (url: string, timeout = 60000): Promise<Response> => {
    const controller = new AbortController()

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        controller?.abort()
        reject(new Error('Request timed out'))
      }, timeout)

      fetch(url, { signal: controller.signal })
        .then((response) => {
          clearTimeout(timeoutId)
          resolve(response)
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            reject(new Error('Request was aborted'))
          } else {
            reject(error)
          }
        })
    })
  }

  async retrieveThroughHttpGateway(
    cid: string,
    fileName = '',
  ): Promise<string> {
    console.log('use IPFS HTTP gateway')

    const listOfIpfsGatewaysUrls = [
      `https://koii-k2-task-metadata.s3.us-east-2.amazonaws.com/${cid}/${fileName}`,
      `https://${cid}.ipfs.w3s.link/${fileName}`,
      `https://ipfs-gateway.koii.live/ipfs/${cid}/${fileName}`,
      `https://${cid}.ipfs.dweb.link/${fileName}`,
      `https://gateway.ipfs.io/ipfs/${cid}/${fileName}`,
      `https://ipfs.io/ipfs/${cid}/${fileName}`,
      `https://ipfs.eth.aragon.network/ipfs/${cid}/${fileName}`,
    ]

    for (const url of listOfIpfsGatewaysUrls) {
      try {
        const response = await this.fetchWithTimeout(url)
        const fileContent = await response.text()
        const couldNotFetchActualFileContent = fileContent.startsWith('<')

        if (!couldNotFetchActualFileContent) {
          return fileContent
        }

        console.log(`Gateway failed at ${url}, trying next if available.`)
      } catch (error) {
        console.error(`Error fetching from ${url}:`, error)
      }
    }

    throw Error(`Failed to get ${cid} from IPFS`)
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

  async getTaskDistributionInfo(
    round: number,
  ): Promise<TaskDistributionInfo | null> {
    if (taskNodeAdministered) {
      const taskDistributionInfo: TaskDistributionInfo = await genericHandler(
        'getTaskDistributionInfo',
        round,
      )
      if (
        typeof taskDistributionInfo === 'object' &&
        'error' in taskDistributionInfo
      ) {
        return null
      }
      return taskDistributionInfo
    } else {
      return this.testingTaskState
    }
  }

  async distributionListAuditSubmission(
    candidatePubkey: PublicKey,
    isValid: boolean,
    voterKeypair: Keypair,
    round: number,
  ): Promise<void> {
    if (taskNodeAdministered) {
      await genericHandler(
        'distributionListAuditSubmission',
        candidatePubkey,
        isValid,
        round,
      )
    } else {
      if (
        this.testingTaskState!.distributions_audit_trigger[round] &&
        this.testingTaskState!.distributions_audit_trigger[round][
          candidatePubkey.toBase58()
        ]
      ) {
        this.testingTaskState!.distributions_audit_trigger[round][
          candidatePubkey.toBase58()
        ].votes.push({
          is_valid: isValid,
          voter: voterKeypair.publicKey,
          slot: 100,
        })
      } else {
        this.testingTaskState!.distributions_audit_trigger[round] = {
          [candidatePubkey.toBase58()]: {
            trigger_by: this.testingStakingSystemAccount!.publicKey,
            slot: 100,
            votes: [],
          },
        }
      }
    }
  }

  async validateAndVoteOnDistributionList(
    validateDistribution: (
      submissionValue: string,
      round: number,
      nodePublicKey: string,
    ) => Promise<boolean>,
    round: number,
    //isPreviousRoundFailed?: boolean,
  ): Promise<void | string> {
    console.log('******/  IN VOTING OF DISTRIBUTION LIST /******')
    //isPreviousRoundFailed = isPreviousRoundFailed ?? false
    // let tasknodeVersionSatisfied = false
    // const taskNodeVersion = await this.getTaskNodeVersion()
    // if (semver.gte(taskNodeVersion, '1.11.19')) {
    //   tasknodeVersionSatisfied = true
    // }
    let taskAccountDataJSON: TaskDistributionInfo | null = null
    try {
      taskAccountDataJSON = await this.getTaskDistributionInfo(round)
    } catch (error) {
      console.error('Error in getting distributions for the round', error)
    }
    if (taskAccountDataJSON == null) {
      console.log('No distribution submissions found for the round', round)
      return
    }
    console.log(
      `Fetching the Distribution submissions of round ${round}`,
      taskAccountDataJSON.distribution_rewards_submission[round],
    )
    const submissions =
      taskAccountDataJSON?.distribution_rewards_submission[round]
    if (submissions == null || submissions == undefined) {
      console.log(`No submisssions found in round ${round}`)
      return `No submisssions found in round ${round}`
    } else {
      const keys = Object.keys(submissions)
      const values = Object.values(submissions)
      const size = values.length
      console.log(
        'Distribution Submissions from last round: ',
        keys,
        values,
        size,
      )
      let isValid: boolean
      const submitterAccountKeyPair = await this.getSubmitterAccount()
      const submitterPubkey = submitterAccountKeyPair?.publicKey.toBase58()

      for (let i = 0; i < size; i++) {
        let candidatePublicKey = keys[i]
        console.log('FOR CANDIDATE KEY', candidatePublicKey)
        let candidateKeyPairPublicKey = new PublicKey(keys[i])
        if (candidatePublicKey == submitterPubkey && taskNodeAdministered) {
          console.log('YOU CANNOT VOTE ON YOUR OWN DISTRIBUTION SUBMISSIONS')
        } else {
          try {
            console.log(
              'DISTRIBUTION SUBMISSION VALUE TO CHECK',
              values[i].submission_value,
            )
            isValid = await validateDistribution(
              values[i].submission_value,
              round,
              candidatePublicKey,
            )
            console.log(`Voting ${isValid} to ${candidatePublicKey}`)

            if (isValid) {
              const distributions_audit_trigger =
                taskAccountDataJSON.distributions_audit_trigger[round]
              console.log(
                'SUBMIT DISTRIBUTION AUDIT TRIGGER',
                distributions_audit_trigger,
              )
              if (
                distributions_audit_trigger &&
                distributions_audit_trigger[candidatePublicKey]
              ) {
                console.log('VOTING TRUE ON DISTRIBUTION AUDIT')
                const response = await this.distributionListAuditSubmission(
                  candidateKeyPairPublicKey,
                  isValid,
                  submitterAccountKeyPair!,
                  round,
                )
                console.log(
                  'RESPONSE FROM DISTRIBUTION AUDIT FUNCTION',
                  response,
                )
              }
            } else if (isValid == false) {
              console.log('RAISING AUDIT / VOTING FALSE ON DISTRIBUTION')
              const response = await this.distributionListAuditSubmission(
                candidateKeyPairPublicKey,
                isValid,
                submitterAccountKeyPair!,
                round,
              )
              console.log('RESPONSE FROM DISTRIBUTION AUDIT FUNCTION', response)
            }
          } catch (err) {
            console.log('ERROR IN ELSE CONDITION FOR DISTRIBUTION', err)
          }
        }
      }
    }
  }

  async getDistributionList(
    publicKey: string,
    round: number,
  ): Promise<any | null> {
    console.log('GET DISTRIBUTION LIST CALLED')
    if (taskNodeAdministered) {
      const response = await genericHandler(
        'getDistributionList',
        publicKey,
        round,
      )
      if (response.error) {
        return null
      }
      return response
    } else {
      const submissionValAcc =
        this.testingTaskState!.distribution_rewards_submission[round][
          this.testingStakingSystemAccount!.publicKey.toBase58()
        ].submission_value
      console.log('testingDistributionList', this.testingDistributionList)
      return this.testingDistributionList![round][submissionValAcc]
    }
  }

  async nodeSelectionDistributionList(
    round: number,
    isPreviousFailed: boolean,
  ): Promise<string | void> {
    let taskAccountDataJSON: TaskSubmissionState | null = null
    try {
      taskAccountDataJSON = await this.getTaskSubmissionInfo(round)
    } catch (error) {
      console.error('Task submission not found', error)
      return
    }

    if (taskAccountDataJSON == null) {
      console.error('Task state not found')
      return
    }
    console.log('EXPECTED ROUND', round)

    const submissions = taskAccountDataJSON.submissions[round]
    if (submissions == null) {
      console.log('No submisssions found in N-1 round')
      return 'No submisssions found in N-1 round'
    } else {
      let keys: string[] = []
      const latestRounds = [round, round - 1, round - 2].filter((r) => r >= 0)

      const promises = latestRounds.map(async (r) => {
        if (r == round) {
          return new Set(Object.keys(submissions))
        } else {
          let roundSubmissions: TaskSubmissionState | null = null
          try {
            roundSubmissions = await this.getTaskSubmissionInfo(r)
            if (roundSubmissions && roundSubmissions.submissions[r]) {
              return new Set(Object.keys(roundSubmissions.submissions[r]))
            }
          } catch (error) {
            console.error('Error in getting submissions for the round', error)
          }
          return new Set<string>()
        }
      })

      const keySets = await Promise.all(promises)

      keys =
        keySets.length > 0
          ? [...keySets[0]].filter((key) =>
              keySets.every((set) => set.has(key)),
            )
          : []
      if (keys.length == 0) {
        console.log('No common keys found in last 3 rounds')
        keys = Object.keys(submissions)
      }
      console.log('KEYS', keys.length)
      const values = keys.map((key) => submissions[key])

      let size = keys.length
      console.log('Submissions from N-2 round: ', size)

      try {
        const distributionData = await this.getTaskDistributionInfo(round)
        const audit_record = distributionData?.distributions_audit_record
        if (audit_record && audit_record[round] == 'PayoutFailed') {
          console.log('ROUND DATA', audit_record[round])
          const submitterList =
            distributionData.distribution_rewards_submission[round]
          const submitterKeys = Object.keys(submitterList)
          console.log('SUBMITTER KEYS', submitterKeys)
          const submitterSize = submitterKeys.length
          console.log('SUBMITTER SIZE', submitterSize)

          for (let j = 0; j < submitterSize; j++) {
            console.log('SUBMITTER KEY CANDIDATE', submitterKeys[j])
            const id = keys.indexOf(submitterKeys[j])
            console.log('ID', id)
            if (id != -1) {
              keys.splice(id, 1)
              values.splice(id, 1)
              size--
            }
          }

          console.log('KEYS FOR HASH CALC', keys.length)
        }
      } catch (error) {
        console.log('Error in getting distribution data', error)
      }

      const ValuesString = JSON.stringify(values)
      const hashDigest = createHash('sha256').update(ValuesString).digest('hex')

      console.log('HASH DIGEST', hashDigest)

      const calculateScore = (str: string = ''): number => {
        return str.split('').reduce((acc, val) => {
          return acc + val.charCodeAt(0)
        }, 0)
      }

      const compareASCII = (str1: string, str2: string): number => {
        const firstScore = calculateScore(str1)
        const secondScore = calculateScore(str2)
        return Math.abs(firstScore - secondScore)
      }

      const selectedNode = {
        score: 0,
        pubkey: '',
      }
      let score = 0
      if (isPreviousFailed) {
        let leastScore = -Infinity
        let secondLeastScore = -Infinity
        for (let i = 0; i < size; i++) {
          const candidateSubmissionJson: Record<string, any> = {}
          candidateSubmissionJson[keys[i]] = values[i]
          const candidateSubmissionString = JSON.stringify(
            candidateSubmissionJson,
          )
          const candidateSubmissionHash = createHash('sha256')
            .update(candidateSubmissionString)
            .digest('hex')
          const candidateScore = compareASCII(
            hashDigest,
            candidateSubmissionHash,
          )
          if (candidateScore > leastScore) {
            secondLeastScore = leastScore
            leastScore = candidateScore
          } else if (candidateScore > secondLeastScore) {
            secondLeastScore = candidateScore
            selectedNode.score = candidateScore
            selectedNode.pubkey = keys[i]
          }
        }
      } else {
        for (let i = 0; i < size; i++) {
          const candidateSubmissionJson: Record<string, any> = {}
          candidateSubmissionJson[keys[i]] = values[i]
          const candidateSubmissionString = JSON.stringify(
            candidateSubmissionJson,
          )
          const candidateSubmissionHash = createHash('sha256')
            .update(candidateSubmissionString)
            .digest('hex')
          const candidateScore = compareASCII(
            hashDigest,
            candidateSubmissionHash,
          )
          if (candidateScore > score) {
            score = candidateScore
            selectedNode.score = candidateScore
            selectedNode.pubkey = keys[i]
          }
        }
      }

      console.log('SELECTED NODE OBJECT', selectedNode)
      return selectedNode.pubkey
    }
  }

  async getAverageSlotTime(): Promise<number> {
    if (taskNodeAdministered) {
      try {
        return await genericHandler('getAverageSlotTime')
      } catch (error) {
        console.error('Error getting average slot time', error)
        return 400
      }
    } else {
      return 400
    }
  }

  async payoutTrigger(round: number): Promise<void> {
    if (taskNodeAdministered) {
      await genericHandler('payloadTrigger', round)
    } else {
      console.log('Payout Trigger only handles positive flows (Without audits)')

      round = 1
      const submissionValAcc =
        this.testingDistributionList![round][
          this.testingStakingSystemAccount!.publicKey.toBase58()
        ].submission_value
      this.testingTaskState!.available_balances =
        this.testingDistributionList![round][submissionValAcc]
    }
  }

  async selectAndGenerateDistributionList(
    submitDistributionList: (round: number) => Promise<void>,
    round: number,
    isPreviousRoundFailed: boolean,
  ): Promise<void> {
    console.log('SelectAndGenerateDistributionList called')
    const selectedNode = await this.nodeSelectionDistributionList(
      round,
      isPreviousRoundFailed,
    )
    console.log('Selected Node', selectedNode)
    const submitPubKey = await this.getSubmitterAccount()

    if (!selectedNode || !submitPubKey) return

    console.log('Selected Node', selectedNode)
    console.log('Submitter PubKey', submitPubKey.publicKey.toBase58())
    console.log('Round', round)

    if (selectedNode === submitPubKey?.publicKey.toBase58()) {
      console.log('IN SELECTED NODE CONDITION AND CALLING SUBMIT DISTRIBUTION')
      await submitDistributionList(round)
      const taskState = await this.getTaskState({})
      if (taskState == null) {
        console.error('Task state not found')
        return
      }
      const avgSlotTime = await this.getAverageSlotTime()
      if (avgSlotTime == null) {
        console.error('Avg slot time not found')
        return
      }
      setTimeout(
        async () => {
          await this.payoutTrigger(round)
        },
        (taskState.audit_window + taskState.submission_window) * avgSlotTime,
      )
    }
  }
  getTestingStakingWallet(): Keypair {
    if (process.env.STAKING_WALLET_PATH) {
      const wallet = readFileSync(process.env.STAKING_WALLET_PATH, 'utf-8')
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(wallet)))
    } else {
      return new Keypair()
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

function parseTaskState(
  taskState,
  is_submission_required = false,
  is_distribution_required = false,
  is_available_balances_required = false,
  is_stake_list_required = false,
) {
  if (is_stake_list_required) {
    taskState.stake_list = objectify(taskState.stake_list, true)
  } else {
    taskState.stake_list = {}
  }
  taskState.ip_address_list = objectify(taskState.ip_address_list, true)
  if (is_distribution_required) {
    taskState.distributions_audit_record = objectify(
      taskState.distributions_audit_record,
      true,
    )
    taskState.distributions_audit_trigger = objectify(
      taskState.distributions_audit_trigger,
      true,
    )
    taskState.distribution_rewards_submission = objectify(
      taskState.distribution_rewards_submission,
      true,
    )
  } else {
    taskState.distributions_audit_record = {}
    taskState.distributions_audit_trigger = {}
    taskState.distribution_rewards_submission = {}
  }
  if (is_submission_required) {
    taskState.submissions = objectify(taskState.submissions, true)
    taskState.submissions_audit_trigger = objectify(
      taskState.submissions_audit_trigger,
      true,
    )
  } else {
    taskState.submissions = {}
    taskState.submissions_audit_trigger = {}
  }

  if (is_available_balances_required) {
    taskState.available_balances = objectify(taskState.available_balances, true)
  } else {
    taskState.available_balances = {}
  }
  return taskState
}

function objectify(data, recursive = false) {
  if (data instanceof Map) {
    const obj = Object.fromEntries(data)
    if (recursive) {
      for (const key in obj) {
        if (obj[key] instanceof Map) {
          obj[key] = objectify(obj[key], true)
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          obj[key] = objectify(obj[key], true)
        }
      }
    }
    return obj
  }
  return data
}

const namespaceWrapper = new NamespaceWrapper()

if (taskNodeAdministered) {
  namespaceWrapper.getRpcUrl().then((rpcUrl) => {
    console.log(rpcUrl, 'RPC URL')
    if (typeof rpcUrl === 'string') {
      connection = new Connection(rpcUrl, 'confirmed')
    }
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
