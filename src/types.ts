import Datastore from 'nedb-promises'
import { Keypair, PublicKey } from '@_koi/web3.js'

// Define types for the handler response and arguments

export type GenericHandlerResponse = any

export enum LogLevel {
  Log = 'log',
  Warn = 'warn',
  Error = 'error',
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
  getSlot(): Promise<number>
  getNodes(url: string): Promise<any>
  getRpcUrl(): Promise<string | void>
  getProgramAccounts(): Promise<any>
  logMessage(level: LogLevel, message: string, action: any): Promise<boolean>
  logger(level: LogLevel, message: string, action: any): Promise<boolean>
  checkSubmissionAndUpdateRound(
    submissionValue: string,
    round: number,
  ): Promise<void>
  storeGet(key: string): Promise<string | null>
  getTaskState(options: any): Promise<any>
  getTaskLevelDBPath(): Promise<string>
  defaultTaskSetup(): Promise<void>
  validateAndVoteOnNodes(
    validate: (submissionValue: string, round: number) => Promise<boolean>,
    round: number,
  ): Promise<void | string>
  getTaskSubmissionInfo(round: number): Promise<TaskSubmissionState | null>
  getSubmitterAccount(): Promise<Keypair | null>
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
