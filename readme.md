# Koii Namespace Wrapper

The Namespace Wrapper is a core utility package that serves as the bridge between Koii tasks and the Koii Network infrastructure. It abstracts the complexity of task node operations by providing a unified API for essential functions such as:

- Task state persistence and retrieval
- Secure blockchain transaction handling
- File system operations in both local and distributed environments
- Distribution list management and reward calculations
- Node-to-node communication and validation
- Audit submission and verification processes

This wrapper ensures that task developers can focus on their core task logic while the wrapper handles the intricacies of node operations, state management, and network interactions in a secure and standardized way.

For further information on the namespace wrapper, please see the [Koii docs](https://www.koii.network/docs/develop/write-a-koii-task/namespace-wrapper/the-namespace-object).

## Installation

```bash
npm install @_koii/namespace-wrapper
# or
yarn add @_koii/namespace-wrapper
```

## Basic Setup

1. Import the namespace wrapper:

```typescript
import { namespaceWrapper } from '@_koii/namespace-wrapper'
```

```javascript
const { namespaceWrapper } = require('@_koii/namespace-wrapper')
```

## Key Features

- **State Management**: Persistent storage using NeDB for task-specific data
- **Blockchain Integration**: Direct interface with Koii Network through Web3.js
- **File System Operations**: Standardized file system access for both local and task node environments
- **Secure Communications**: Built-in cryptographic functions for payload signing and verification
- **Task Distribution**: Support for managing task distribution and rewards
- **Logging System**: Structured logging capabilities for debugging and monitoring
- **Express Server**: Built-in HTTP server for task communication

## NamespaceWrapper Importable Variables

| Variable            | Example Value                  | Description                      |
| ------------------- | ------------------------------ | -------------------------------- |
| TASK_NAME           | "MyKoiiTask"                   | Name of the task                 |
| TASK_ID             | "task_12345..."                | Unique identifier for the task   |
| EXPRESS_PORT        | 3000                           | Port for the Express server      |
| MAIN_ACCOUNT_PUBKEY | "pubkey123..."                 | Main account public key          |
| K2_NODE_URL         | "https://mainnet.koii.network" | Koii network node URL            |
| SERVICE_URL         | "http://localhost:3001"        | Service endpoint URL             |
| STAKE               | 1000                           | Stake amount in KOII             |
| TASK_NODE_PORT      | 8000                           | Port for task node communication |
| STAKING_WALLET_PATH | "./wallet.json"                | Path to staking wallet file      |

## Exported Functions

### Core Functions

#### getDb(): Promise\<void\>

- **Description**: get the KOIIDB [reference](https://www.npmjs.com/package/nedb-promises)
- **Example Usage and Output**:

```typescript
try {
  const db = await namespaceWrapper.getDb()

  // Insert a document into the database
  const insertResult = await db.insert({ name: 'John Doe', age: 30 })
  console.log('Insert result:', insertResult)

  // Find documents matching a query
  const foundDocs = await db.find({ age: { $gt: 20 } })
  console.log('Found documents:', foundDocs)

  // Find a single document matching a query
  const singleDoc = await db.findOne({ name: 'John Doe' })
  console.log('Single document:', singleDoc)

  // Update documents matching a query
  const updateResult = await db.update(
    { name: 'John Doe' },
    { $set: { age: 31 } },
  )
  console.log('Update result:', updateResult)

  // Remove documents matching a query
  const removeResult = await db.remove({ age: { $lt: 25 } })
  console.log('Remove result:', removeResult)

  // Count documents matching a query
  const count = await db.count({ age: { $gt: 20 } })
  console.log('Count of matching documents:', count)

  // Load the database
  const loadResult = await db.loadDatabase()
  console.log('Load database result:', loadResult)

  // Ensure an index is created for a particular field
  const ensureIndexResult = await db.ensureIndex({ fieldName: 'name' })
  console.log('Ensure index result:', ensureIndexResult)

  // Get all data from the database
  const allData = await db.getAllData()
  console.log('All data in the database:', allData)
} catch (error) {
  console.error('An error occurred:', error)
}
```

#### storeSet(key: string, value: string): Promise\<void\>

- **Description**: Stores a value in the persistent storage
- **Inputs**:
  - key: String identifier for the value
  - value: String value to store
- **Outputs**: Promise resolving when storage is complete
- **Example Usage and Output**:

```typescript
// Successful storage
const config = {
  taskName: 'ImageProcessing',
  version: '1.0.0',
  settings: {
    maxRetries: 3,
    timeout: 5000,
  },
}

await namespaceWrapper.storeSet('taskConfig', JSON.stringify(config))
// Verify storage
const stored = await namespaceWrapper.storeGet('taskConfig')
console.log(JSON.parse(stored))
// Output: {
//   "taskName": "ImageProcessing",
//   "version": "1.0.0",
//   "settings": {
//     "maxRetries": 3,
//     "timeout": 5000
//   }
// }

// Error case (invalid value)
try {
  await namespaceWrapper.storeSet('taskConfig', undefined)
} catch (error) {
  console.error(error)
}
```

#### storeGet(key: string): Promise<string | null>

- **Description**: Retrieves a value from the persistent storage
- **Inputs**:
  - key: String identifier for the stored value
- **Outputs**: Promise resolving to the stored value or null
- **Example Usage and Output**:

```typescript
// Successful retrieval
const value = await namespaceWrapper.storeGet('taskConfig')
console.log(value)
// Output: {
//   "roundDuration": 3600,
//   "minStake": 1000,
//   "lastUpdateTime": 1678234567890
// }

// Key not found
const missingValue = await namespaceWrapper.storeGet('nonexistentKey')
console.log(missingValue)
// Output: null

// Error case (database connection issue)
try {
  const value = await namespaceWrapper.storeGet('myKey')
} catch (error) {
  console.error(error)
}
```

### File System Operations

#### fs(method: string, path: string, ...args: any[]): Promise\<any\>

- **Description**: Executes file system operations in a standardized way
- **Inputs**:
  - method: File system method to execute. Available options come from [FS promises](https://docs.deno.com/api/node/fs/promises/) methods.
  - path: File path
  - args: Additional arguments for the method
- **Outputs**: Promise resolving to the operation result
- **Example Usage and Output**:

```typescript
// Writing a file
await namespaceWrapper.fs('writeFile', 'myFile.txt', 'Hello World')
// Output: undefined

// Reading a file
const data = await namespaceWrapper.fs('readFile', 'myFile.txt', 'utf8')
console.log(data)
// Output: "Hello World"
```

#### fsStaking(method: string, path: string, ...args: any[]): Promise\<any\>

- **Description**: A decentralized staking platform enabling secure token locking for rewards.
- **Inputs**:
  - method: File system method to execute
  - path: File path
  - args: Additional arguments for the method
- **Outputs**: Promise resolving to the operation result
- **Example Usage and Output**:

```typescript
const data = await namespaceWrapper.fsStaking(
  'readFile',
  'stake_info.txt',
  'utf8',
)
console.log(data)
// Output: {"stakeAmount": 1000, "stakingAddress": "koii..."}
```

#### fsWriteStream(imagepath: string): Promise<WriteStream | void>

- **Description**: Creates a write stream for file operations
- **Inputs**:
  - imagepath: Path to the file
- **Outputs**: Promise resolving to a WriteStream object
- **Example Usage and Output**:

```typescript
const getBasePath = await namespaceWrapper.getBasePath()
const imgPath = `${getBasePath}/img/output.jpg`

// Successful write stream creation and usage
const writeStream = await namespaceWrapper.fsWriteStream(imgPath)
if (writeStream) {
  // Write image data
  writeStream.write(imageBuffer)
  writeStream.end()

  writeStream.on('finish', () => {
    console.log('Write completed')
    // Output: Write completed
  })
}

// Error case (invalid path)
try {
  const writeStream = await namespaceWrapper.fsWriteStream(
    '/invalid/path/image.jpg',
  )
} catch (error) {
  console.error(error)
}

// Error case (permission denied)
try {
  const writeStream = await namespaceWrapper.fsWriteStream(
    '/root/restricted.jpg',
  )
} catch (error) {
  console.error(error)
}
```

#### fsReadStream(imagepath: string): Promise<Buffer | void>

- **Description**: Creates a read stream for file operations
- **Inputs**:
  - imagepath: Path to the file
- **Outputs**: Promise resolving to a Buffer
- **Example Usage and Output**:

```typescript
const getBasePath = await namespaceWrapper.getBasePath()
const imgPath = `${getBasePath}/img/output.jpg`

// Successful read
const imageBuffer = await namespaceWrapper.fsReadStream(imgPath)
console.log(imageBuffer)
// Output: <Buffer ff d8 ff e0 00 10 4a 46 49 46 ...>
console.log(imageBuffer.length)
// Output: 24580 // Size in bytes

// Error case (file not found)
try {
  const buffer = await namespaceWrapper.fsReadStream('nonexistent.jpg')
} catch (error) {
  console.error(error)
}

// Error case (corrupted file)
try {
  const buffer = await namespaceWrapper.fsReadStream('corrupted.jpg')
} catch (error) {
  console.error(error)
}
```

### Blockchain Operations

#### payloadSigning(body: Record<string, unknown>): Promise<string | void>

- **Description**: Signs a payload for blockchain transactions using the main wallet's public key.
- **Inputs**:
  - body: Object containing the payload data
- **Outputs**: Promise resolving to the signed message
- **Example Usage and Output**:

```typescript
// Successful signing
const payload = {
  data: 'Hello World',
  timestamp: Date.now(),
  nonce: Math.random(),
}

const signedPayload = await namespaceWrapper.payloadSigning(payload)
console.log(signedPayload)
// Output: "2J7PRqTxj1NVnYzgx2KBGz4KRJHEwzT8GJkHxb6J1q9B4K8rYt5JvKq7rz3vXqH..."

// Error case (invalid payload)
try {
  const signedPayload = await namespaceWrapper.payloadSigning(undefined)
} catch (error) {
  console.error(error)
}

// Error case (missing key)
try {
  const signedPayload = await namespaceWrapper.payloadSigning({})
} catch (error) {
  console.error(error)
}
```

#### verifySignature(signedMessage: string, pubKey: string): Promise<{ data?: string; error?: string }>

- **Description**: Verifies a signed message
- **Inputs**:
  - signedMessage: The signed message to verify
  - pubKey: Public key for verification
- **Outputs**: Promise resolving to verification result
- **Example Usage and Output**:

```typescript
// Successful verification
const result = await namespaceWrapper.verifySignature(
  '2J7PRqTxj1NVnYzgx2KBGz4KRJHEwzT8GJkHxb6J1q9B4K8rYt5JvKq7rz3vXqH...',
  'koiiX8UPJY6gCMqD1RfNoQhWiJzyPwXX2Cj7vqWe9mV',
)

if (!result) {
  console.error('Signature verification failed.')
} else {
  console.log(result)
  // Output: {
  //   data: "{\"data\":\"Hello World\",\"timestamp\":1678234567890,\"nonce\":0.123456789}"
  // }
}

// Error case (invalid signature)
const invalidResult = await namespaceWrapper.verifySignature(
  'invalidSignature',
  'koiiX8UPJY6gCMqD1RfNoQhWiJzyPwXX2Cj7vqWe9mV',
)
console.log(invalidResult)

// Error case (mismatched public key)
const mismatchResult = await namespaceWrapper.verifySignature(
  '2J7PRqTxj1NVnYzgx2KBGz4KRJHEwzT8GJkHxb6J1q9B4K8rYt5JvKq7rz3vXqH...',
  'koiiWrongPubKeyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
)
console.log(mismatchResult)
```

### Task Management

#### getTaskState(options: TaskStateOptions): Promise<TaskState | null>

- **Description**: Retrieves the current state of the task
- **Inputs**:
  - options: Configuration options for state retrieval
    {
    is_submission_required?: boolean, // Whether to include submission data
    is_distribution_required?: boolean, // Whether to include distribution data
    is_available_balances_required?: boolean, // Whether to include balance data
    is_stake_list_required?: boolean // Whether to include stake list
    }
- **Outputs**: Promise resolving to task state object
- **Example Usage**:

```typescript
// Data will be included if true, otherwise not shown even if fields are present.
const state = await namespaceWrapper.getTaskState({
  is_submission_required: true,
  is_distribution_required: true,
  is_available_balances_required: true,
  is_stake_list_required: true,
})

console.log(state)
// {
//   task_id: string,                      // Unique identifier for the task
//   task_name: string,                    // Name of the task
//   task_manager: PublicKey,              // Task manager's public key
//   is_allowlisted: boolean,              // Whether task is allowlisted
//   is_active: boolean,                   // Whether task is active
//   task_audit_program: string,           // Audit program identifier
//   stake_pot_account: PublicKey,         // Staking pot account
//   total_bounty_amount: number,          // Total bounty for the task
//   bounty_amount_per_round: number,      // Bounty per round
//   current_round: number,                // Current round number
//   available_balances: Record<string, number>, // Available balances per account
//   stake_list: Record<string, number>,   // List of stakers and amounts
//   task_metadata: string,                // Task metadata
//   task_description: string,             // Task description
//   submissions: SubmissionsPerRound,     // Submissions for each round
//   submissions_audit_trigger: Record<string, Record<string, AuditTriggerState>>, // Audit triggers
//   total_stake_amount: number,           // Total staked amount
//   minimum_stake_amount: number,         // Minimum required stake
//   ip_address_list: Record<string, string>, // List of node IPs
//   round_time: number,                   // Time per round
//   starting_slot: number,                // Starting slot number
//   audit_window: number,                 // Audit window duration
//   submission_window: number,            // Submission window duration
//   task_executable_network: 'IPFS' | 'ARWEAVE', // Network type
//   distribution_rewards_submission: SubmissionsPerRound, // Reward distributions
//   distributions_audit_trigger: Record<string, Record<string, AuditTriggerState>>, // Distribution audit triggers
//   distributions_audit_record: Record<string, 'Uninitialized' | 'PayoutSuccessful' | 'PayoutFailed'>, // Audit records
//   task_vars: string,                    // Task-specific variables
//   koii_vars: string,                    // Koii network variables
//   is_migrated: boolean,                 // Migration status
//   migrated_to: string,                  // Migration target
//   allowed_failed_distributions: number   // Max allowed failed distributions
// }
```

#### validateAndVoteOnNodes(validate: (submissionValue: string, round: number, nodePublicKey: string,) => Promise<boolean>, round: number): Promise<void | string>

- **Description**: Validates and votes on node submissions
- **Inputs**:
  - validate: Validation function
  - round: Current round number
- **Outputs**: Promise resolving to validation result
- **Example Usage**:

```typescript
// Validates and votes on nodes
await namespaceWrapper.validateAndVoteOnNodes(
  async (submission, round, nodePublicKey) => true,
  currentRound,
)
```

#### checkSubmissionAndUpdateRound(submissionValue: string = 'default', round: number): Promise\<void\>

- **Description**: Verifies submissions and updates the current round
- **Input**: Add the submission and the roundNumber
- **Outputs**: Promise resolving when complete
- **Example Usage**:

```typescript
if (submission) {
  await namespaceWrapper.checkSubmissionAndUpdateRound(submission, roundNumber)
}
```

#### getTaskStateById(taskId: string, task_type: TaskType, options: TaskStateOptions): Promise<TaskState | null>

- **Description**: Retrieves task state for a specific task ID and the task type
- **Inputs**:
  - taskId: Task identifier
  - task_type: KOII or KPL
  - options: TaskStateOptions
    {
    is_submission_required?: boolean, // Whether to include submission data
    is_distribution_required?: boolean, // Whether to include distribution data
    is_available_balances_required?: boolean, // Whether to include balance data
    is_stake_list_required?: boolean // Whether to include stake list
    }
- **Outputs**: Promise resolving to task state
- **Example Usage**:
<!-- from below you can get the Task id -->

```typescript
import { namespaceWrapper, TASK_ID } from '@_koii/namespace-wrapper';
```

```javascript
const { namespaceWrapper, TASK_ID } = require('@_koii/namespace-wrapper')
```

```typescript
const getInfo = await namespaceWrapper.getTaskStateById(TASK_ID, 'KOII', {
  is_submission_required: true,
  is_distribution_required: true,
  is_available_balances_required: true,
  is_stake_list_required: true,
})

// expected output
// {
//   task_id: string,                      // Unique identifier for the task
//   task_name: string,                    // Name of the task
//   task_manager: PublicKey,              // Task manager's public key
//   is_allowlisted: boolean,              // Whether task is allowlisted
//   is_active: boolean,                   // Whether task is active
//   task_audit_program: string,           // Audit program identifier
//   stake_pot_account: PublicKey,         // Staking pot account
//   total_bounty_amount: number,          // Total bounty for the task
//   bounty_amount_per_round: number,      // Bounty per round
//   current_round: number,                // Current round number
//   available_balances: Record<string, number>, // Available balances per account
//   stake_list: Record<string, number>,   // List of stakers and amounts
//   task_metadata: string,                // Task metadata
//   task_description: string,             // Task description
//   submissions: SubmissionsPerRound,     // Submissions for each round
//   submissions_audit_trigger: Record<string, Record<string, AuditTriggerState>>, // Audit triggers
//   total_stake_amount: number,           // Total staked amount
//   minimum_stake_amount: number,         // Minimum required stake
//   ip_address_list: Record<string, string>, // List of node IPs
//   round_time: number,                   // Time per round
//   starting_slot: number,                // Starting slot number
//   audit_window: number,                 // Audit window duration
//   submission_window: number,            // Submission window duration
//   task_executable_network: 'IPFS' | 'ARWEAVE', // Network type
//   distribution_rewards_submission: SubmissionsPerRound, // Reward distributions
//   distributions_audit_trigger: Record<string, Record<string, AuditTriggerState>>, // Distribution audit triggers
//   distributions_audit_record: Record<string, 'Uninitialized' | 'PayoutSuccessful' | 'PayoutFailed'>, // Audit records
//   task_vars: string,                    // Task-specific variables
//   koii_vars: string,                    // Koii network variables
//   is_migrated: boolean,                 // Migration status
//   migrated_to: string,                  // Migration target
//   allowed_failed_distributions: number  // Max allowed failed distributions
// }
```

### Network Operations

#### getNodes(url: string)

- **Description**: Retrieves information about network nodes
- **Inputs**:
  - url: API endpoint URL
- **Outputs**: An array of objects representing the node information, directly returned by the function.
- **Example Usage and Output**:

```typescript
const nodes = await namespaceWrapper.getNodes('https://api.koii.network/')
console.log(nodes)
// Output:
// [
//   {
//    data: {
//      url: string | undefined,    // Node URL
//      timestamp: number           // Last update timestamp
//    },
//    signature: string,             // Node signature
//    owner: string,                 // Node owner
//    submitterPubkey: string        // Submitter's public key
//    task: string                   // task ID
//   }, ...
// ]
```

#### getRpcUrl(): Promise<string | void>

- **Description**: Gets the current RPC URL for the Koii network
- **Outputs**: Promise resolving to the RPC URL
- **Example Usage and Output**:

```typescript
const rpcUrl = await namespaceWrapper.getRpcUrl()
console.log(rpcUrl)

// Output: "https://mainnet.koii.network"
```

### Transaction Operations

#### sendAndConfirmTransactionWrapper(transaction: Transaction, signers: Keypair[]): Promise<string | void>

- **Description**: Sends and confirms a transaction on the Koii network
- **Inputs**:
  - transaction: Transaction object
  - signers: Array of signing keypairs
- **Outputs**: Promise resolving to transaction signature
- **Example Usage and Output**:

```typescript
const result = await namespaceWrapper.sendAndConfirmTransactionWrapper(tx, [
  signer,
])
console.log(result)
// Output: "4Gf4kP3Qs4GpFASdeEweJnzR..." (Transaction signature as a string)
```

#### sendTransaction(serviceNodeAccount: PublicKey, beneficiaryAccount: PublicKey, amount: number): Promise<string | void>

- **Description**: Sends a transaction between accounts
- **Inputs**:
  - serviceNodeAccount: Service node's public key
  - beneficiaryAccount: Recipient's public key
  - amount: Transaction amount (in lamports)
- **Outputs**: Promise resolving to transaction result
- **Example Usage and Output**:

```typescript
// Successful transaction
try {
  const txSignature = await namespaceWrapper.sendTransaction(
    new PublicKey('serviceNode123...'),
    new PublicKey('recipient456...'),
    100,
  )
  console.log(txSignature)
  // Output: "4vC38p8b1BMRDmjWTgfVHZf48vJUYC7ySZkXuC6EhQzF9Ny8m2jFS93..."
} catch (error) {
  console.error(error)
}
```

#### getProgramAccounts()

- **Description**: Retrieves all program accounts associated with the task
- **Outputs**: Promise resolving to program accounts data
- **Example Usage and Output**:

```typescript
// Retrieves all program accounts.
const accounts = await namespaceWrapper.getProgramAccounts();
console.log(accounts);
// Output:
Output: Array<{
  pubkey: PublicKey,           // Account public key
  account: AccountInfo<Buffer>  // Account information
}>
```

#### claimReward(stakePotAccount: PublicKey, beneficiaryAccount: PublicKey, claimerKeypair: Keypair): Promise<string | void>

- **Description**: Claims rewards for a specific round
- **Inputs**:
  - stakePotAccount: PublicKey // The stake pot account
  - beneficiaryAccount: PublicKey // Account to receive rewards
  - claimerKeypair: Keypair // Keypair of the claimer
- **Outputs**: Promise resolving to transaction signature
- **Example Usage and Output**:

```typescript
// Successful claim
try {
  const stakePotAccount = new PublicKey('YourStakePotAccountPublicKeyHere')
  const beneficiaryAccount = new PublicKey(
    'YourBeneficiaryAccountPublicKeyHere',
  )
  const claimerKeypair = Keypair.fromSecretKey(
    new Uint8Array([...yourSecretKeyArray]),
  )

  const txSignature = await namespaceWrapper.claimReward(
    stakePotAccount,
    beneficiaryAccount,
    claimerKeypair,
  )
  console.log(txSignature)
  // Output:
  //   - string ("2ZxVnRvqUptpP5FfgbiFh6q5zNkTJqh8sM8JKvtqJF3G...") // Transaction signature
} catch (error) {
  console.error(error)
}

// Verify claim
try {
  const rewardStatus = await namespaceWrapper.getTaskState({
    is_available_balances_required: true,
  })
  console.log(rewardStatus.available_balances)
} catch (error) {
  console.error(error)
}
```

#### stakeOnChain(taskStateInfoPublicKey: PublicKey, stakingAccKeypair: Keypair, stakePotAccount: PublicKey, stakeAmount: number): Promise<string | void>

- **Description**: Stakes tokens for a task.
- **Inputs**:
  - taskStateInfoPublicKey: PublicKey
  - stakingAccKeypair: Keypair
  - stakePotAccount: PublicKey
  - stakeAmount: number (in KOII)
- **Outputs**: Promise resolving to transaction signature
- **Example Usage**:

```typescript
import { PublicKey, Keypair } from '@_koii/web3.js'

try {
  const taskStateInfoPublicKey = new PublicKey('YourTaskStateInfoPublicKeyHere') // The public key associated with the task
  const stakingAccKeypair = Keypair.generate() // Replace with the actual staking account keypair
  const stakePotAccount = new PublicKey('YourStakePotAccountPublicKeyHere') // The stake pot account public key
  const stakeAmount = 100 // Example stake amount in KOII (replace with your desired amount)

  // Call the function
  const transactionSignature = await stakeOnChain(
    taskStateInfoPublicKey,
    stakingAccKeypair,
    stakePotAccount,
    stakeAmount,
  )

  console.log('Stake Successful! Transaction Signature:', transactionSignature)
} catch (error) {
  console.error('Error staking on-chain:', error)
}
```

### Path and Location Operations

#### getTaskDBPath(): Promise\<string\>

- **Description**: Gets the path to the task's NeDB database
- **Outputs**: Promise resolving to database path
- **Example Usage**:

```typescript
const dbPath = await namespaceWrapper.getTaskLevelDBPath()
console.log(dbPath)
// Output:
//   - string ("your_local_path/namespace/TASK_ID/KOIIDB") // DB path
```

#### getBasePath(): Promise\<string\>

- **Description**: Gets the base path to the task folder for performing file operations
- **Outputs**: Promise resolving to base path
- **Example Usage**:

```typescript
const basePath = await namespaceWrapper.getBasePath();

console.log(basePath);
// Output:
//   - string ("your_local_path/namespace/TASK_ID/")
```

### Round Management

#### getRound(): Promise\<number\>

- **Description**: Gets the current round number
- **Outputs**: Promise resolving to current round number
- **Example Usage**:

```typescript
const currentRound = await namespaceWrapper.getRound();

console.log(currentRound);
// Output:
//   - number (1 or current number of that specific round)
```

### Task Information

#### getTaskSubmissionInfo(round: number): Promise<TaskSubmissionState | null>

- **Description**: Retrieves submission information for the task
- **Inputs**: round: number (current round number)
- **Outputs**: Promise resolving to submission state
- **Example Usage and Output**:

```typescript
// Successful retrieval with multiple submissions
const submissionInfo = await namespaceWrapper.getTaskSubmissionInfo(1);
console.log(JSON.stringify(submissionInfo, null, 2));

// Output:
{
  submissions: SubmissionsPerRound
  submissions_audit_trigger: Record<string, Record<string, AuditTriggerState>>
}

// Error case (no submissions yet)
const emptySubmissionInfo = await namespaceWrapper.getTaskSubmissionInfo(10);
console.log(emptySubmissionInfo);
// Output: or throw error because not found
{
  "submissions": {},
  "submissions_audit_trigger": {}
}

// Error case (network error)
try {
  const info = await namespaceWrapper.getTaskSubmissionInfo(3);
} catch (error) {
  console.error(error);
}
```

#### getSubmitterAccount(): Promise<Keypair | null>

- **Description**: Gets the submitter's account Keypair
- **Outputs**: Promise resolving to submitter's Keypair
- **Example Usage**:

```typescript
const submitterKey = await namespaceWrapper.getSubmitterAccount();

// Output:
// - Keypair { secretKey: Uint8Array(64) [/* secret key bytes */], publicKey: PublicKey { /* public key */ } }
```

#### getMainAccountPubkey(): Promise<string | null>

- **Description**: Gets the main account's public key
- **Outputs**: Promise resolving to main account public key
- **Example Usage**:

```typescript
const mainPubkey = await namespaceWrapper.getMainAccountPubkey()

// Output: '5Hh7i4K6Qhb9P3hLk9mnEJzLbxnsXjdJ6sWxYbR4tT5z' | null
```

#### getTaskNodeVersion(): Promise\<string\>

- **Description**: Gets the task node version
- **Outputs**: Promise resolving to version string
- **Example Usage**:

```typescript
const version = await namespaceWrapper.getTaskNodeVersion();

console.log(version); // Output: "1.11.19";
```

### Audit and Distribution Operations

#### auditSubmission(candidatePubkey: PublicKey, isValid: boolean, voterKeypair: Keypair, round: number): Promise\<void\>

- **Description**: Audits a submission for a specific round
- **Inputs**:
  - candidatePubkey: PublicKey
  - isValid: boolean
  - voterKeypair: Keypair
  - round: number
- **Outputs**: Promise resolving to audit result
- **Example Usage and Output**:

```typescript
const candidatePubkey = new PublicKey('...') // The public key of the candidate being audited
const isValid = true // Whether the submission is valid
const voterKeypair = Keypair.generate() // A Keypair for the voter (can be a new or existing one)
const round = 1 // Current round of auditing

await auditSubmission(candidatePubkey, isValid, voterKeypair, round)
```

#### distributionListSubmissionOnChain(round: number): Promise<string | void>

- **Description**: Submits distribution list to the blockchain
- **Inputs**:
  - round: Round number
- **Example Usage**:

```typescript
try {
  const round = 1 // Current round of distribution submission
  const result = await distributionListSubmissionOnChain(round)
  console.log(result)
  // Output:
  ;-'5eZGF6A3g7K5kp59h6fJH7fHGePsy9H8kE1JYjxjixHvbfYqmn3URznUnhbcqpmRWRbbY4o8D9Ak2vhwKjfBbgC2' // (transaction signature (a string))
} catch (error) {
  console.log(error)
}
```

#### uploadDistributionList(distributionList: Record<string, any>, round: number ): Promise<boolean | null>

- **Description**: Uploads a distribution list for a round
- **Inputs**:
  - distributionList: Object containing distribution data
  - round: number (the round number)
- **Example Usage and Output**:

```typescript
// Uploads a distribution list for a specific round.
try {
  const distributionList = {
    candidate1: { value: 100 },
    candidate2: { value: 200 },
  }
  const round = 1

  const result = await uploadDistributionList(distributionList, round)
  console.log(result) // Output: true (if everything works as expected)
} catch (error) {
  console.error(error)
}
```

#### getTaskDistributionInfo(round: number): Promise<TaskDistributionInfo | null>

- **Description**: Gets distribution information for the task
- **Input**: round number (current round number)
- **Outputs**: Promise resolving to distribution info
- **Example Usage**:

```typescript
try {
  const round = 1 // current the round number
  const distributionInfo = await getTaskDistributionInfo(round)
  console.log('Distribution Info:', distributionInfo)
  // Expected output:
  // Distribution Info: {
  //   distribution_rewards_submission: SubmissionsPerRound
  //   distributions_audit_trigger: Record<string, Record<string, AuditTriggerState>>
  //   distributions_audit_record: Record<
  //     string,
  //     'Uninitialized' | 'PayoutSuccessful' | 'PayoutFailed'
  //   >
  // }
} catch (error) {
  console.log(error)
}
```

#### distributionListAuditSubmission(candidatePubkey: PublicKey, isValid: boolean, voterKeypair: Keypair, round: number): Promise\<void\>

- **Description**: Audits a distribution list submission
- **Inputs**:
  - candidatePubkey: PublicKey (the candidate's public key)
  - isValid: boolean (whether the distribution is valid)
  - voterKeypair: Keypair
  - round: number (the round number)
- **Outputs**: Promise resolving to audit result
- **Example Usage and Output**:

```typescript
// Successful audit
try {
  const candidatePubkey = new PublicKey('candidate-public-key')
  const isValid = true // The vote is in favor of the candidate
  const voterKeypair = Keypair.generate() // Generate a random voter keypair
  const round = 1 // Round number

  await distributionListAuditSubmission(
    candidatePubkey,
    isValid,
    voterKeypair,
    round,
  )
} catch (error) {
  console.error(error)
}
```

#### validateAndVoteOnDistributionList(validateDistribution: (submissionValue: string, round: number, nodePublicKey: string) => Promise\<boolean\>, round: number): Promise<string | void>

- **Description**: Validates and votes on distribution lists
- **Inputs**:
  - validateDistribution: Validation function
  - round: Round number
- **Example Usage**:

```typescript
try {
  const round = 1 // The round to validate
  await validateAndVoteOnDistributionList(this.validateDistribution, round)
} catch (error) {
  console.log(error)
}
```

#### getDistributionList(publicKey: string, round: number): Promise<any | null>

- **Description**: Gets the distribution list for a specific round
- **Inputs**:
  - publicKey: string
  - round: Round number
- **Outputs**: Promise resolving to distribution list
- **Example Usage and Output**:

```typescript
try {
  const publicKey = 'somePublicKey'
  const round = 1

  // Call getDistributionList method
  const distributionList = await myService.getDistributionList(publicKey, round)
  console.log('Distribution List:', distributionList) // Distribution List: {"reward": 100, "user": "someUser"}
} catch (error) {
  console.log(error)
}
```

#### nodeSelectionDistributionList(round: number, isPreviousFailed: boolean): Promise<string | void>

- **Description**: Selects nodes for distribution
- **Inputs**:
  - round: Round number
  - isPreviousFailed: Whether previous attempt failed
- **Outputs**: Promise resolving to selected node public key
- **Example Usage**:

```typescript
try {
  // Example values for the round and isPreviousFailed flag
  const round = 5
  const isPreviousFailed = false // Adjust based on the scenario

  // Calling the nodeSelectionDistributionList function
  const selectedNodePubkey = await myService.nodeSelectionDistributionList(
    round,
    isPreviousFailed,
  )
  console.log('Selected Node Public Key:', selectedNodePubkey)
} catch (error) {
  console.log(error)
}
```

#### getAverageSlotTime(): Promise\<number\>

- **Description**: Gets average slot time for the network
- **Outputs**: Promise resolving to slot time in milliseconds
- **Example Usage and Output**:

```typescript
try {
  const averageSlotTime = await myService.getAverageSlotTime()
  console.log(averageSlotTime) // Expected output: 150
} catch (error) {
  console.log(error)
}
```

#### payoutTrigger(round: number): Promise\<void\>

- **Description**: Triggers payout for a specific round
- **Inputs**:
  - round: Round number
- **Example Usage**:

```typescript
try {
  await namespaceWrapper.payoutTrigger(currentRound)
} catch (error) {
  console.log(error)
}
```

#### selectAndGenerateDistributionList(submitDistributionList: (round: number) => Promise\<void\>, round: number, isPreviousRoundFailed: boolean): Promise\<void\>

- **Description**: Generates and selects distribution list
- **Inputs**:
  - round: Round number
- **Example Usage**:

```typescript
try {
  const round = 4 // current round
  const isPreviousRoundFailed = true // boolean value only

  await namespaceWrapper.selectAndGenerateDistributionList(
    this.submitDistributionList,
    round,
    isPreviousRoundFailed,
  )
} catch (error) {
  console.log(error)
}
```

#### logger(level: LogLevel, message: string, action: string): Promise\<boolean\>

- **Description**: Logs messages based on specified log level (log, warn, error).
- **Inputs**:
  - level: log, warn or error
  - message: a string value
  - action: a string value
- **Output**: A boolean value
- **Example Usage**:

```typescript
try {
  // Log a normal message (log level)
  const logSuccess = await namespaceWrapper.logger(
    'log',
    'Task has been successfully completed!',
    'TaskCompletion',
  )
  console.log('Log success:', logSuccess) // Expected output: true

  // Log a warning message (warn level)
  const warnSuccess = await namespaceWrapper.logger(
    'warn',
    'Task took longer than expected!',
    'TaskWarning',
  )
  console.log('Warn success:', warnSuccess) // Expected output: true

  // Log an error message (error level)
  const errorSuccess = await namespaceWrapper.logger(
    'error',
    'Task failed due to an unknown error!',
    'TaskError',
  )
  console.log('Error success:', errorSuccess) // Expected output: true

  // Log with an invalid log level
  const invalidLogSuccess = await namespaceWrapper.logger(
    'invalid',
    'This should fail',
    'TaskFailure',
  )
  console.log('Invalid log success:', invalidLogSuccess) // Expected output: false
} catch (error) {
  console.log(error)
}
```

#### getSlot(): Promise\<number\>

- **Description**: Get the current slot number
- **Output**: returns a number
- **Example Usage**:

```typescript
try {
  const slot = await getSlot()
  console.log(slot) // Output: 500

  const slot = await getSlot()
  console.log(slot) // Output: 0, and logs "Error getting slot: {}"

  const slot = await getSlot()
  console.log(slot) // Output: 100
} catch (error) {
  console.log(error)
}
```

## Type Definitions

### Core Types

```typescript
// Task State Options
interface TaskStateOptions {
  is_submission_required?: boolean
  is_distribution_required?: boolean
  is_available_balances_required?: boolean
  is_stake_list_required?: boolean
}

// Task State
interface TaskState {
  task_id: string
  task_name: string
  task_description: string
  total_bounty_amount: number
  bounty_amount_per_round: number
  total_stake_amount: number
  minimum_stake_amount: number
  round_time: number
  // ... other properties
}

// Submission Types
interface Submission {
  submission_value: string
  slot: number
  round?: number
}

type SubmissionsPerRound = Record<string, Record<string, Submission>>

// Distribution Types
interface TaskDistributionInfo {
  distribution_rewards_submission: SubmissionsPerRound
  distributions_audit_trigger: Record<string, Record<string, AuditTriggerState>>
  distributions_audit_record: Record<
    string,
    'Uninitialized' | 'PayoutSuccessful' | 'PayoutFailed'
  >
}
```

## Support

For support, please contact Koii Network through:

- [Discord Community](https://discord.com/invite/koii-network)
- [Documentation](https://docs.koii.network)

## License

This package is licensed under the ISC License. See the LICENSE file for details.
