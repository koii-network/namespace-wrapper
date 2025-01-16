# Koii Namespace Wrapper

The Namespace Wrapper is a core utility package that serves as the bridge between Koii tasks and the Koii Network infrastructure. It abstracts the complexity of task node operations by providing a unified API for essential functions such as:
- Task state persistence and retrieval
- Secure blockchain transaction handling
- File system operations in both local and distributed environments
- Distribution list management and reward calculations
- Node-to-node communication and validation
- Audit submission and verification processes

This wrapper ensures that task developers can focus on their core task logic while the wrapper handles the intricacies of node operations, state management, and network interactions in a secure and standardized way.

## Installation

```bash
npm install @_koii/namespace-wrapper
# or
yarn add @_koii/namespace-wrapper
```

## Basic Setup

1. Import the namespace wrapper:
```typescript
import { namespaceWrapper } from '@_koii/namespace-wrapper';
```

2. Initialize environment variables in your `.env` file:
```env
TASK_NAME=MyKoiiTask
TASK_ID=your_task_id
EXPRESS_PORT=3000
...
```

3. Initialize the wrapper in your task:
```typescript
await namespaceWrapper.initializeDB();
```

## Key Features
- **State Management**: Persistent storage using NeDB for task-specific data
- **Blockchain Integration**: Direct interface with Koii Network through Web3.js
- **File System Operations**: Standardized file system access for both local and task node environments
- **Secure Communications**: Built-in cryptographic functions for payload signing and verification
- **Task Distribution**: Support for managing task distribution and rewards
- **Logging System**: Structured logging capabilities for debugging and monitoring
- **Express Server**: Built-in HTTP server for task communication

## Environment Variables
Note: These variables are not needed when using the Koii Task Template.

| Variable | Example Value | Description | Required |
|----------|--------------|-------------|-----------|
| TASK_NAME | "MyKoiiTask" | Name of the task | Yes |
| TASK_ID | "task_12345..." | Unique identifier for the task | Yes |
| EXPRESS_PORT | 3000 | Port for the Express server | No (defaults to 3000) |
| MAIN_ACCOUNT_PUBKEY | "pubkey123..." | Main account public key | Yes |
| SECRET_KEY | "secret123..." | Secret key for signing transactions | Yes |
| K2_NODE_URL | "https://testnet.koii.network" | Koii network node URL | No (defaults to testnet) |
| SERVICE_URL | "http://localhost:8080" | Service endpoint URL | Yes |
| STAKE | 1000 | Stake amount in KOII | Yes |
| TASK_NODE_PORT | 8000 | Port for task node communication | Yes |
| STAKING_WALLET_PATH | "./wallet.json" | Path to staking wallet file | No |

## Exported Functions

### Core Functions

#### storeGet(key: string): Promise<string | null>
- **Description**: Retrieves a value from the persistent storage
- **Inputs**: 
  - key: String identifier for the stored value
- **Outputs**: Promise resolving to the stored value or null
- **Example Usage and Output**:
```typescript
// Successful retrieval
const value = await namespaceWrapper.storeGet("taskConfig");
console.log(value);
// Output: {
//   "roundDuration": 3600,
//   "minStake": 1000,
//   "lastUpdateTime": 1678234567890
// }

// Key not found
const missingValue = await namespaceWrapper.storeGet("nonexistentKey");
console.log(missingValue);
// Output: null

// Error case (database connection issue)
try {
  const value = await namespaceWrapper.storeGet("myKey");
} catch (error) {
  console.error(error);
  // Output: Error: Failed to connect to database: ECONNREFUSED
}
```

#### storeSet(key: string, value: string): Promise<void>
- **Description**: Stores a value in the persistent storage
- **Inputs**: 
  - key: String identifier for the value
  - value: String value to store
- **Outputs**: Promise resolving when storage is complete
- **Example Usage and Output**:
```typescript
// Successful storage
const config = {
  taskName: "ImageProcessing",
  version: "1.0.0",
  settings: {
    maxRetries: 3,
    timeout: 5000
  }
};

await namespaceWrapper.storeSet("taskConfig", JSON.stringify(config));
// Verify storage
const stored = await namespaceWrapper.storeGet("taskConfig");
console.log(JSON.parse(stored));
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
  await namespaceWrapper.storeSet("taskConfig", undefined);
} catch (error) {
  console.error(error);
  // Output: Error: Value must be a string
}

// Error case (storage limit exceeded)
try {
  const largeData = "x".repeat(10000000); // Very large string
  await namespaceWrapper.storeSet("largeKey", largeData);
} catch (error) {
  console.error(error);
  // Output: Error: Storage limit exceeded
}
```

### File System Operations

#### fs(method: string, path: string, ...args: any[]): Promise<any>
- **Description**: Executes file system operations in a standardized way
- **Inputs**:
  - method: File system method to execute
  - path: File path
  - args: Additional arguments for the method
- **Outputs**: Promise resolving to the operation result
- **Example Usage and Output**:
```typescript
// Writing a file
await namespaceWrapper.fs("writeFile", "myFile.txt", "Hello World");
// Output: undefined

// Reading a file
const data = await namespaceWrapper.fs("readFile", "myFile.txt", "utf8");
console.log(data);
// Output: "Hello World"
```

#### fsStaking(method: string, path: string, ...args: any[]): Promise<any>
- **Description**: Executes file system operations in the staking context
- **Inputs**:
  - method: File system method to execute
  - path: File path
  - args: Additional arguments for the method
- **Outputs**: Promise resolving to the operation result
- **Example Usage and Output**:
```typescript
const data = await namespaceWrapper.fsStaking("readFile", "stake_info.txt", "utf8");
console.log(data);
// Output: {"stakeAmount": 1000, "stakingAddress": "koii..."}
```

#### fsWriteStream(imagepath: string): Promise<WriteStream | void>
- **Description**: Creates a write stream for file operations
- **Inputs**:
  - imagepath: Path to the file
- **Outputs**: Promise resolving to a WriteStream object
- **Example Usage and Output**:
```typescript
// Successful write stream creation and usage
const writeStream = await namespaceWrapper.fsWriteStream("output.jpg");
if (writeStream) {
  // Write image data
  writeStream.write(imageBuffer);
  writeStream.end();
  
  writeStream.on('finish', () => {
    console.log('Write completed');
    // Output: Write completed
  });
}

// Error case (invalid path)
try {
  const writeStream = await namespaceWrapper.fsWriteStream("/invalid/path/image.jpg");
} catch (error) {
  console.error(error);
  // Output: Error: ENOENT: no such file or directory
}

// Error case (permission denied)
try {
  const writeStream = await namespaceWrapper.fsWriteStream("/root/restricted.jpg");
} catch (error) {
  console.error(error);
  // Output: Error: EACCES: permission denied
}
```

#### fsReadStream(imagepath: string): Promise<Buffer | void>
- **Description**: Creates a read stream for file operations
- **Inputs**:
  - imagepath: Path to the file
- **Outputs**: Promise resolving to a Buffer
- **Example Usage and Output**:
```typescript
// Successful read
const imageBuffer = await namespaceWrapper.fsReadStream("input.jpg");
console.log(imageBuffer);
// Output: <Buffer ff d8 ff e0 00 10 4a 46 49 46 ...>
console.log(imageBuffer.length);
// Output: 24580 // Size in bytes

// Error case (file not found)
try {
  const buffer = await namespaceWrapper.fsReadStream("nonexistent.jpg");
} catch (error) {
  console.error(error);
  // Output: Error: ENOENT: no such file or directory

// Error case (corrupted file)
try {
  const buffer = await namespaceWrapper.fsReadStream("corrupted.jpg");
} catch (error) {
  console.error(error);
  // Output: Error: Invalid file format
}
```

### Blockchain Operations

#### payloadSigning(body: Record<string, unknown>): Promise<string | void>
- **Description**: Signs a payload for blockchain transactions
- **Inputs**:
  - body: Object containing the payload data
- **Outputs**: Promise resolving to the signed message
- **Example Usage and Output**:
```typescript
// Successful signing
const payload = {
  data: "Hello World",
  timestamp: Date.now(),
  nonce: Math.random()
};

const signedPayload = await namespaceWrapper.payloadSigning(payload);
console.log(signedPayload);
// Output: "2J7PRqTxj1NVnYzgx2KBGz4KRJHEwzT8GJkHxb6J1q9B4K8rYt5JvKq7rz3vXqH..."

// Error case (invalid payload)
try {
  const signedPayload = await namespaceWrapper.payloadSigning(undefined);
} catch (error) {
  console.error(error);
  // Output: Error: Invalid payload: Payload must be a non-null object

// Error case (missing key)
try {
  const signedPayload = await namespaceWrapper.payloadSigning({});
} catch (error) {
  console.error(error);
  // Output: Error: Failed to sign payload: No signing key available
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
  "2J7PRqTxj1NVnYzgx2KBGz4KRJHEwzT8GJkHxb6J1q9B4K8rYt5JvKq7rz3vXqH...",
  "koiiX8UPJY6gCMqD1RfNoQhWiJzyPwXX2Cj7vqWe9mV"
);
console.log(result);
// Output: {
//   data: "{\"data\":\"Hello World\",\"timestamp\":1678234567890,\"nonce\":0.123456789}"
// }

// Error case (invalid signature)
const invalidResult = await namespaceWrapper.verifySignature(
  "invalidSignature",
  "koiiX8UPJY6gCMqD1RfNoQhWiJzyPwXX2Cj7vqWe9mV"
);
console.log(invalidResult);
// Output: { error: "Invalid signature format" }

// Error case (mismatched public key)
const mismatchResult = await namespaceWrapper.verifySignature(
  "2J7PRqTxj1NVnYzgx2KBGz4KRJHEwzT8GJkHxb6J1q9B4K8rYt5JvKq7rz3vXqH...",
  "koiiWrongPubKeyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);
console.log(mismatchResult);
// Output: { error: "Signature verification failed" }
```

### Task Management

#### getTaskState(options: TaskStateOptions): Promise<TaskState | null>
- **Description**: Retrieves the current state of the task
- **Inputs**:
  - options: Configuration options for state retrieval
- **Outputs**: Promise resolving to task state object
- **Example Usage**:
```typescript
const state = await namespaceWrapper.getTaskState({
  is_submission_required: true
});
```

#### validateAndVoteOnNodes(validate: Function, round: number): Promise<void | string>
- **Description**: Validates and votes on node submissions
- **Inputs**:
  - validate: Validation function
  - round: Current round number
- **Outputs**: Promise resolving to validation result
- **Example Usage**:
```typescript
await namespaceWrapper.validateAndVoteOnNodes(
  async (submission, round, nodePublicKey) => true,
  currentRound
);
```

#### checkSubmissionAndUpdateRound(): Promise<void>
- **Description**: Verifies submissions and updates the current round
- **Outputs**: Promise resolving when complete
- **Example Usage**:
```typescript
await namespaceWrapper.checkSubmissionAndUpdateRound();
```

#### getTaskStateById(taskId: string): Promise<TaskState | null>
- **Description**: Retrieves task state for a specific task ID
- **Inputs**:
  - taskId: Task identifier
- **Outputs**: Promise resolving to task state
- **Example Usage**:
```typescript
const state = await namespaceWrapper.getTaskStateById("task_123");
```

### Network Operations

#### getNodes(url: string): Promise<any>
- **Description**: Retrieves information about network nodes
- **Inputs**:
  - url: API endpoint URL
- **Outputs**: Promise resolving to node information
- **Example Usage and Output**:
```typescript
const nodes = await namespaceWrapper.getNodes("https://api.koii.network/nodes");
console.log(nodes);
// Output:
{
  "nodes": [
    {
      "nodeId": "node1",
      "status": "active",
      "stake": 5000,
      "uptime": 99.9
    },
    // ... more nodes
  ]
}
```

#### getRpcUrl(): Promise<string | void>
- **Description**: Gets the current RPC URL for the Koii network
- **Outputs**: Promise resolving to the RPC URL
- **Example Usage and Output**:
```typescript
const rpcUrl = await namespaceWrapper.getRpcUrl();
console.log(rpcUrl);
// Output: "https://testnet.koii.network"
```

### Transaction Operations

#### sendAndConfirmTransactionWrapper(transaction: Transaction, signers: Keypair[]): Promise<void | string>
- **Description**: Sends and confirms a transaction on the Koii network
- **Inputs**:
  - transaction: Transaction object
  - signers: Array of signing keypairs
- **Outputs**: Promise resolving to transaction signature
- **Example Usage and Output**:
```typescript
const result = await namespaceWrapper.sendAndConfirmTransactionWrapper(tx, [signer]);
console.log(result);
// Output: "5UfCbqmK8Qsr9mmkUyt6tFGWJxVNi3vfMr6iXLhHoTR7HEK..."
```

#### sendTransaction(serviceNodeAccount: PublicKey, beneficiaryAccount: PublicKey, amount: number): Promise<void | string>
- **Description**: Sends a transaction between accounts
- **Inputs**:
  - serviceNodeAccount: Service node's public key
  - beneficiaryAccount: Recipient's public key
  - amount: Transaction amount
- **Outputs**: Promise resolving to transaction result
- **Example Usage and Output**:
```typescript
// Successful transaction
try {
  const txSignature = await namespaceWrapper.sendTransaction(
    new PublicKey("serviceNode123..."),
    new PublicKey("recipient456..."),
    100
  );
  console.log(txSignature);
  // Output: "4vC38p8b1BMRDmjWTgfVHZf48vJUYC7ySZkXuC6EhQzF9Ny8m2jFS93..."

  // Check transaction status
  const status = await connection.getSignatureStatus(txSignature);
  console.log(status);
  // Output: {
  //   slot: 123456789,
  //   confirmations: 1,
  //   err: null
  // }
} catch (error) {
  // Error case (insufficient funds)
  console.error(error);
  // Output: Error: Transaction failed: Insufficient funds

  // Error case (invalid account)
  console.error(error);
  // Output: Error: Invalid account: Account not found

  // Error case (network error)
  console.error(error);
  // Output: Error: Network error: Unable to reach node
}
```

#### getProgramAccounts(): Promise<any>
- **Description**: Retrieves all program accounts associated with the task
- **Outputs**: Promise resolving to program accounts data
- **Example Usage and Output**:
```typescript
const accounts = await namespaceWrapper.getProgramAccounts();
console.log(accounts);
// Output:
{
  "accounts": [
    {
      "pubkey": "koii...",
      "account": {
        "lamports": 1000000,
        "data": [...],
        "owner": "koii...",
        "executable": false
      }
    }
    // ... more accounts
  ]
}
```

#### claimReward(round: number): Promise<string | void>
- **Description**: Claims rewards for a specific round
- **Inputs**:
  - round: Round number for which to claim rewards
- **Outputs**: Promise resolving to transaction signature
- **Example Usage and Output**:
```typescript
// Successful claim
try {
  const txSignature = await namespaceWrapper.claimReward(5);
  console.log(txSignature);
  // Output: "2ZxVnRvqUptpP5FfgbiFh6q5zNkTJqh8sM8JKvtqJF3G..."

  // Verify claim
  const rewardStatus = await namespaceWrapper.getTaskState({
    is_available_balances_required: true
  });
  console.log(rewardStatus.available_balances);
  // Output: {
  //   "koiiX8UPJY6...": 1000,  // Updated balance after claim
  //   "previousRewards": 5000,
  //   "claimedRounds": [1, 2, 3, 4, 5]
  // }
} catch (error) {
  // Error case (already claimed)
  console.error(error);
  // Output: Error: Rewards for round 5 already claimed

  // Error case (invalid round)
  console.error(error);
  // Output: Error: Invalid round: Round not completed

  // Error case (no rewards)
  console.error(error);
  // Output: Error: No rewards available for round 5
}
```

#### stakeOnChain(amount: number): Promise<string | void>
- **Description**: Stakes KOII tokens for task participation
- **Inputs**:
  - amount: Amount of KOII to stake
- **Outputs**: Promise resolving to transaction signature
- **Example Usage**:
```typescript
const txSignature = await namespaceWrapper.stakeOnChain(1000);
```

### Path and Location Operations

#### getTaskLevelDBPath(): Promise<string>
- **Description**: Gets the path to the task's LevelDB database
- **Outputs**: Promise resolving to database path
- **Example Usage**:
```typescript
const dbPath = await namespaceWrapper.getTaskLevelDBPath();
```

#### getBasePath(): Promise<string>
- **Description**: Gets the base path for task operations
- **Outputs**: Promise resolving to base path
- **Example Usage**:
```typescript
const basePath = await namespaceWrapper.getBasePath();
```

### Round Management

#### getRound(): Promise<number>
- **Description**: Gets the current round number
- **Outputs**: Promise resolving to current round number
- **Example Usage**:
```typescript
const currentRound = await namespaceWrapper.getRound();
```

### Task Information

#### getTaskSubmissionInfo(): Promise<TaskSubmissionState>
- **Description**: Retrieves submission information for the task
- **Outputs**: Promise resolving to submission state
- **Example Usage and Output**:
```typescript
// Successful retrieval with multiple submissions
const submissionInfo = await namespaceWrapper.getTaskSubmissionInfo();
console.log(JSON.stringify(submissionInfo, null, 2));
// Output:
{
  "submissions": {
    "round_1": {
      "node1": {
        "submission_value": "QmX7bGd8XuE8f9J7VbcNZsxeJKz3biMhPqLcTwXQjZkJ9K",
        "slot": 12345,
        "round": 1,
        "timestamp": 1678234567890
      },
      "node2": {
        "submission_value": "QmY9kL5zH2wF6J7MpR8VbcMZsxeJKz3biMhPqLcTwXQjZkL",
        "slot": 12346,
        "round": 1,
        "timestamp": 1678234567891
      }
    },
    "round_2": {
      "node1": {
        "submission_value": "QmZ1kL5zH2wF6J7MpR8VbcMZsxeJKz3biMhPqLcTwXQjZkM",
        "slot": 12347,
        "round": 2,
        "timestamp": 1678234567892
      }
    }
  },
  "submissions_audit_trigger": {
    "round_1": {
      "node1": {
        "trigger_by": "koii1234...",
        "slot": 12345,
        "votes": [
          {
            "is_valid": true,
            "voter": "koii5678...",
            "slot": 12346,
            "reason": "valid_hash_match"
          },
          {
            "is_valid": true,
            "voter": "koii9012...",
            "slot": 12346,
            "reason": "valid_content_verification"
          }
        ]
      }
    }
  }
}

// Error case (no submissions yet)
const emptySubmissionInfo = await namespaceWrapper.getTaskSubmissionInfo();
console.log(emptySubmissionInfo);
// Output:
{
  "submissions": {},
  "submissions_audit_trigger": {}
}

// Error case (network error)
try {
  const info = await namespaceWrapper.getTaskSubmissionInfo();
} catch (error) {
  console.error(error);
  // Output: Error: Failed to fetch submission info: Network error
}
```

#### getSubmitterAccount(): Promise<PublicKey>
- **Description**: Gets the submitter's account public key
- **Outputs**: Promise resolving to submitter's public key
- **Example Usage**:
```typescript
const submitterKey = await namespaceWrapper.getSubmitterAccount();
```

#### getMainAccountPubkey(): Promise<string>
- **Description**: Gets the main account's public key
- **Outputs**: Promise resolving to main account public key
- **Example Usage**:
```typescript
const mainPubkey = await namespaceWrapper.getMainAccountPubkey();
```

#### getTaskNodeVersion(): Promise<string>
- **Description**: Gets the task node version
- **Outputs**: Promise resolving to version string
- **Example Usage**:
```typescript
const version = await namespaceWrapper.getTaskNodeVersion();
```

### Audit and Distribution Operations

#### auditSubmission(submissionValue: string, round: number): Promise<boolean>
- **Description**: Audits a submission for a specific round
- **Inputs**:
  - submissionValue: Value to audit
  - round: Round number
- **Outputs**: Promise resolving to audit result
- **Example Usage and Output**:
```typescript
const isValid = await namespaceWrapper.auditSubmission("value", currentRound);
console.log(isValid);
// Output: true
```

#### distributionListSubmissionOnChain(round: number): Promise<void>
- **Description**: Submits distribution list to the blockchain
- **Inputs**:
  - round: Round number
- **Example Usage**:
```typescript
await namespaceWrapper.distributionListSubmissionOnChain(currentRound);
```

#### uploadDistributionList(distributionList: any, round: number): Promise<void>
- **Description**: Uploads a distribution list for a round
- **Inputs**:
  - distributionList: Distribution data
  - round: Round number
- **Example Usage and Output**:
```typescript
// Successful upload
const distributions = {
  nodes: {
    "node1": {
      amount: 100,
      stake: 1000,
      performance: 0.95,
      tasks_completed: 10
    },
    "node2": {
      amount: 150,
      stake: 1500,
      performance: 0.98,
      tasks_completed: 15
    }
  },
  metadata: {
    total_distribution: 250,
    round_metrics: {
      average_performance: 0.965,
      total_tasks: 25
    }
  }
};

try {
  await namespaceWrapper.uploadDistributionList(distributions, 10);
  
  // Verify upload
  const uploaded = await namespaceWrapper.getDistributionList(10);
  console.log(uploaded);
  // Output: {
  //   [Previous distribution list content]
  //   status: "UPLOADED",
  //   timestamp: 1678234567890,
  //   signature: "dist_sig_123..."
  // }
} catch (error) {
  // Error case (invalid format)
  console.error(error);
  // Output: Error: Invalid distribution list format

  // Error case (round mismatch)
  console.error(error);
  // Output: Error: Distribution list round mismatch

  // Error case (duplicate upload)
  console.error(error);
  // Output: Error: Distribution list already exists for round 10
}
```

#### getTaskDistributionInfo(): Promise<TaskDistributionInfo>
- **Description**: Gets distribution information for the task
- **Outputs**: Promise resolving to distribution info
- **Example Usage**:
```typescript
const distributionInfo = await namespaceWrapper.getTaskDistributionInfo();
```

#### distributionListAuditSubmission(submissionValue: string, round: number): Promise<boolean>
- **Description**: Audits a distribution list submission
- **Inputs**:
  - submissionValue: Value to audit
  - round: Round number
- **Outputs**: Promise resolving to audit result
- **Example Usage and Output**:
```typescript
// Successful audit
try {
  const isValid = await namespaceWrapper.distributionListAuditSubmission(
    "QmX7bGd8XuE8f9J7VbcNZsxeJKz3biMhPqLcTwXQjZkJ9K",
    10
  );
  console.log(isValid);
  // Output: true

  // Get audit details
  const auditInfo = await namespaceWrapper.getTaskDistributionInfo();
  console.log(auditInfo.distributions_audit_trigger["round_10"]);
  // Output: {
  //   "node1": {
  //     trigger_by: "koii123...",
  //     slot: 12345,
  //     votes: [
  //       {
  //         is_valid: true,
  //         voter: "koii456...",
  //         slot: 12346,
  //         audit_data: {
  //           checked_items: 25,
  //           validation_errors: 0,
  //           performance_score: 1.0
  //         }
  //       }
  //     ]
  //   }
  // }
} catch (error) {
  // Error case (invalid submission)
  console.error(error);
  // Output: Error: Invalid submission value format

  // Error case (round not found)
  console.error(error);
  // Output: Error: Round 10 not found in distribution list

  // Error case (audit already completed)
  console.error(error);
  // Output: Error: Audit already completed for round 10
}
```

#### validateAndVoteOnDistributionList(validate: Function, round: number): Promise<void>
- **Description**: Validates and votes on distribution lists
- **Inputs**:
  - validate: Validation function
  - round: Round number
- **Example Usage**:
```typescript
await namespaceWrapper.validateAndVoteOnDistributionList(
  async (submission) => true,
  currentRound
);
```

#### getDistributionList(round: number): Promise<any>
- **Description**: Gets the distribution list for a specific round
- **Inputs**:
  - round: Round number
- **Outputs**: Promise resolving to distribution list
- **Example Usage and Output**:
```typescript
const distributions = await namespaceWrapper.getDistributionList(currentRound);
console.log(distributions);
// Output:
{
  "round": 1,
  "distributions": {
    "node1": {
      "amount": 100,
      "reason": "task_completion"
    },
    "node2": {
      "amount": 50,
      "reason": "validation"
    }
  },
  "total_distribution": 150
}
```

#### nodeSelectionDistributionList(round: number, isPreviousFailed: boolean): Promise<string>
- **Description**: Selects nodes for distribution
- **Inputs**:
  - round: Round number
  - isPreviousFailed: Whether previous attempt failed
- **Outputs**: Promise resolving to selected node public key
- **Example Usage**:
```typescript
const selectedNode = await namespaceWrapper.nodeSelectionDistributionList(round, false);
```

#### getAverageSlotTime(): Promise<number>
- **Description**: Gets average slot time for the network
- **Outputs**: Promise resolving to slot time in milliseconds
- **Example Usage and Output**:
```typescript
const slotTime = await namespaceWrapper.getAverageSlotTime();
console.log(slotTime);
// Output: 400 // milliseconds
```

#### payoutTrigger(round: number): Promise<void>
- **Description**: Triggers payout for a specific round
- **Inputs**:
  - round: Round number
- **Example Usage**:
```typescript
await namespaceWrapper.payoutTrigger(currentRound);
```

#### selectAndGenerateDistributionList(round: number): Promise<void>
- **Description**: Generates and selects distribution list
- **Inputs**:
  - round: Round number
- **Example Usage**:
```typescript
await namespaceWrapper.selectAndGenerateDistributionList(currentRound);
```

## Type Definitions

### Core Types

```typescript
// Task State Options
interface TaskStateOptions {
  is_submission_required?: boolean;
  is_distribution_required?: boolean;
  is_available_balances_required?: boolean;
  is_stake_list_required?: boolean;
}

// Task State
interface TaskState {
  task_id: string;
  task_name: string;
  task_description: string;
  total_bounty_amount: number;
  bounty_amount_per_round: number;
  total_stake_amount: number;
  minimum_stake_amount: number;
  round_time: number;
  // ... other properties
}

// Submission Types
interface Submission {
  submission_value: string;
  slot: number;
  round?: number;
}

type SubmissionsPerRound = Record<string, Record<string, Submission>>;

// Distribution Types
interface TaskDistributionInfo {
  distribution_rewards_submission: SubmissionsPerRound;
  distributions_audit_trigger: Record<string, Record<string, AuditTriggerState>>;
  distributions_audit_record: Record<string, 'Uninitialized' | 'PayoutSuccessful' | 'PayoutFailed'>;
}
```

## Examples

### Basic Task Setup

```typescript
// task.ts
import { namespaceWrapper } from '@_koii/namespace-wrapper';

async function initializeTask() {
  // Initialize database
  await namespaceWrapper.initializeDB();
  
  // Set initial task state
  await namespaceWrapper.storeSet('taskConfig', JSON.stringify({
    roundDuration: 3600,
    minStake: 1000
  }));
  
  // Start task execution
  await executeTask();
}

async function executeTask() {
  // Get current round
  const round = await namespaceWrapper.getRound();
  
  // Perform task work
  const result = await performWork();
  
  // Submit result
  await submitTaskResult(result, round);
}
```

### Distribution List Management

```typescript
// distribution.ts
import { namespaceWrapper } from '@_koii/namespace-wrapper';

async function handleDistribution(round: number) {
  try {
    // Generate distribution list
    const distributions = await generateDistributions(round);
    
    // Upload distribution list
    await namespaceWrapper.uploadDistributionList(distributions, round);
    
    // Submit to chain
    await namespaceWrapper.distributionListSubmissionOnChain(round);
    
    // Trigger payout
    await namespaceWrapper.payoutTrigger(round);
  } catch (error) {
    await namespaceWrapper.logger(
      'error',
      `Distribution failed: ${error.message}`,
      'DISTRIBUTION'
    );
  }
}
```

### Audit Submission Flow

```typescript
// audit.ts
import { namespaceWrapper } from '@_koii/namespace-wrapper';

async function auditSubmissions(round: number) {
  // Get submissions
  const submissionInfo = await namespaceWrapper.getTaskSubmissionInfo();
  
  // Validate submissions
  await namespaceWrapper.validateAndVoteOnNodes(
    async (submission, round, nodePublicKey) => {
      // Implement validation logic
      const isValid = await validateSubmission(submission);
      return isValid;
    },
    round
  );
}

async function auditDistributions(round: number) {
  await namespaceWrapper.validateAndVoteOnDistributionList(
    async (distributionList) => {
      // Implement distribution validation logic
      const isValid = await validateDistribution(distributionList);
      return isValid;
    },
    round
  );
}
```

### Transaction Handling

```typescript
// transactions.ts
import { namespaceWrapper } from '@_koii/namespace-wrapper';
import { Transaction, PublicKey } from '@_koii/web3.js';

async function handleRewards(round: number) {
  try {
    // Claim rewards
    const txSignature = await namespaceWrapper.claimReward(round);
    
    // Verify transaction
    if (txSignature) {
      await namespaceWrapper.logger(
        'log',
        `Rewards claimed: ${txSignature}`,
        'CLAIM_REWARD'
      );
    }
  } catch (error) {
    await namespaceWrapper.logger(
      'error',
      `Failed to claim rewards: ${error.message}`,
      'CLAIM_REWARD'
    );
  }
}
```

### Error Handling Patterns

```typescript
// error-handling.ts
import { namespaceWrapper } from '@_koii/namespace-wrapper';

async function safeExecute<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    await namespaceWrapper.logger(
      'error',
      `Operation failed in ${context}: ${error.message}`,
      'ERROR'
    );
    return null;
  }
}

// Usage example
const result = await safeExecute(
  async () => {
    const round = await namespaceWrapper.getRound();
    const submissions = await namespaceWrapper.getTaskSubmissionInfo();
    return { round, submissions };
  },
  'SUBMISSION_CHECK'
);
```

## Support

For support, please contact Koii Network through:

- [Discord Community](https://discord.gg/koii)
- [Documentation](https://docs.koii.network)

## License

This package is licensed under the ISC License. See the LICENSE file for details.