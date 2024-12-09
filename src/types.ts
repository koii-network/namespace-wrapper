import Datastore from 'nedb-promises'
import { Transaction, Keypair, PublicKey } from '@_koii/web3.js'
import {
  promises as fsPromises,
  createWriteStream,
  WriteStream,
  readFileSync,
} from 'fs'

// Define types for the handler response and arguments

export type GenericHandlerResponse = any

export enum LogLevel {
  Log = 'log',
  Warn = 'warn',
  Error = 'error',
}

export interface TaskStateOptions {
  is_submission_required?: boolean
  is_distribution_required?: boolean
  is_available_balances_required?: boolean
  is_stake_list_required?: boolean
}

export type Submission = {
  submission_value: string
  slot: number
  round?: number // Optional
}

export interface AuditTriggerState {
  trigger_by: PublicKey
  slot: number
  votes: Array<{ is_valid: boolean; voter: PublicKey; slot: number }>
}

export type Round = string
export type PublicKeyString = string

export type SubmissionsPerRound = Record<
  Round,
  Record<PublicKeyString, Submission>
>

export interface TaskSubmissionState {
  submissions: SubmissionsPerRound
  submissions_audit_trigger: Record<string, Record<string, AuditTriggerState>>
}

export interface TaskDistributionInfo {
  distribution_rewards_submission: SubmissionsPerRound
  distributions_audit_trigger: Record<string, Record<string, AuditTriggerState>>
  distributions_audit_record: Record<
    string,
    'Uninitialized' | 'PayoutSuccessful' | 'PayoutFailed'
  >
}

type ROE = number

export interface TaskState {
  task_id: string
  task_name: string
  task_manager: PublicKey | string
  is_allowlisted: boolean
  is_active: boolean
  task_audit_program: string
  stake_pot_account: PublicKey | string
  total_bounty_amount: number
  bounty_amount_per_round: number
  current_round: number
  available_balances: Record<string, ROE>
  stake_list: Record<string, ROE>
  task_metadata: string
  task_description: string
  submissions: SubmissionsPerRound
  submissions_audit_trigger: Record<string, Record<string, AuditTriggerState>>
  total_stake_amount: number
  minimum_stake_amount: number
  ip_address_list: Record<string, string>
  round_time: number
  starting_slot: number
  audit_window: number
  submission_window: number
  task_executable_network: 'IPFS' | 'ARWEAVE'
  distribution_rewards_submission: SubmissionsPerRound
  distributions_audit_trigger: Record<string, Record<string, AuditTriggerState>>
  distributions_audit_record: Record<
    string,
    'Uninitialized' | 'PayoutSuccessful' | 'PayoutFailed'
  >
  task_vars: string
  koii_vars: string
  is_migrated: boolean
  migrated_to: string
  allowed_failed_distributions: number
}

// Interface for the class
export interface TaskNode {
  testingTaskState?: TaskState | null
  testingStakingSystemAccount?: { publicKey: { toBase58(): string } } | null
  testingMainSystemAccount?: Keypair | null
  testingDistributionList?: any | null
  initializeDB(): Promise<void>
  getDb(): Promise<Datastore<Document>>
  storeSet(key: string, value: string): Promise<void>
  fs(
    method: keyof typeof fsPromises,
    path: string,
    ...args: any[]
  ): Promise<any>
  fsStaking(
    method: keyof typeof fsPromises,
    path: string,
    ...args: any[]
  ): Promise<any>
  fsWriteStream(imagepath: string): Promise<WriteStream | void>
  fsReadStream(imagepath: string): Promise<Buffer | void>
  bs58Encode(data: Uint8Array): Promise<string>
  bs58Decode(data: string): Promise<Uint8Array>
  decodePayload(payload: Uint8Array): string
  verifySignature(
    signedMessage: string,
    pubKey: string,
  ): Promise<{ data?: string; error?: string }>
  getSlot(): Promise<number>
  getNodes(url: string): Promise<any>
  getRpcUrl(): Promise<string | void>
  sendAndConfirmTransactionWrapper(
    transaction: Transaction,
    signers: Keypair[],
  ): Promise<void | string>
  sendTransaction(
    serviceNodeAccount: PublicKey,
    beneficiaryAccount: PublicKey,
    amount: number,
  ): Promise<void | string>
  claimReward(
    stakePotAccount: PublicKey,
    beneficiaryAccount: PublicKey,
    claimerKeypair: Keypair,
  ): Promise<void>
  stakeOnChain(
    taskStateInfoPublicKey: PublicKey,
    stakingAccKeypair: Keypair,
    stakePotAccount: PublicKey,
    stakeAmount: number,
  ): Promise<void | string>
  getProgramAccounts(): Promise<any>
  logMessage(level: LogLevel, message: string, action: string): Promise<boolean>
  logger(level: LogLevel, message: string, action: string): Promise<boolean>
  checkSubmissionAndUpdateRound(
    submissionValue: string,
    round: number,
  ): Promise<void>
  storeGet(key: string): Promise<string | null>
  getTaskState(options: any): Promise<any>
  getTaskLevelDBPath(): Promise<string>
  getBasePath(): Promise<string>
  getRound(): Promise<number>
  defaultTaskSetup(): Promise<void>
  validateAndVoteOnNodes(
    validate: (submissionValue: string, round: number) => Promise<boolean>,
    round: number,
    useRandomSampling?: boolean,
    uploadToIPFS?: boolean,
  ): Promise<void | string>
  getTaskSubmissionInfo(round: number): Promise<TaskSubmissionState | null>
  getSubmitterAccount(): Promise<Keypair | null>
  getMainAccountPubkey(): Promise<string | null>
  getTaskNodeVersion(): Promise<string>
  auditSubmission(
    candidatePubkey: PublicKey,
    isValid: boolean,
    voterKeypair: Keypair,
    round: number,
  ): Promise<void>
  distributionListSubmissionOnChain(round: number): Promise<void | string>
  uploadDistributionList(
    distributionList: Record<string, any>,
    round: number,
  ): Promise<boolean | null>
  getTaskDistributionInfo(round: number): Promise<TaskDistributionInfo | null>
  distributionListSubmissionOnChain(round: number): Promise<void | string>
  validateAndVoteOnDistributionList(
    validateDistribution: (
      submissionValue: string,
      round: number,
    ) => Promise<boolean>,
    round: number,
  ): Promise<void | string>
  getDistributionList(publicKey: string, round: number): Promise<any | null>
  nodeSelectionDistributionList(
    round: number,
    isPreviousFailed: boolean,
  ): Promise<string | void>
  payoutTrigger(round: number): Promise<void>
  selectAndGenerateDistributionList(
    submitDistributionList: (round: number) => Promise<void>,
    round: number,
    isPreviousRoundFailed: boolean,
  ): Promise<void>
}

export type TaskType = 'KPL' | 'KOII'
