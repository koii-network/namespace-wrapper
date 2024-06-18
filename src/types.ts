import Datastore from 'nedb-promises'

// Define types for the handler response and arguments

export type GenericHandlerResponse = number | { error: any }

export type Submission = {
  submission_value: string
  slot: number
  round: number
}

// Define the interface for the task state
export interface TaskState {
  submissions: { [round: number]: { [publicKey: string]: Submission } }
}

// Define the interface for the class
export interface TaskNode {
  testingTaskState?: TaskState | null
  testingStakingSystemAccount?: { publicKey: { toBase58(): string } } | null
  initializeDB(): Promise<void>
  getDb(): Promise<Datastore<Document>>
  storeSet(key: string, value: string): Promise<void>
  getSlot(): Promise<number>
  checkSubmissionAndUpdateRound(
    submissionValue: string,
    round: number,
  ): Promise<void>
  storeGet(key: string): Promise<string | null>
  getTaskState(options: any): Promise<any>
  getRpcUrl(): Promise<string>
  getTaskLevelDBPath(): Promise<string>
  defaultTaskSetup(): Promise<void>
}
