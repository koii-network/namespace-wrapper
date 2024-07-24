# Koii Namespace Wrapper Package
This package is designed to facilitate communication and operations between a task node and the Koii blockchain network. It includes various functions for database management, file system operations, transaction handling, and more.

## Installation
```
npm install @_koii/namespace-wrapper
```
## Usage
```
const { namespaceWrapper, taskNodeAdministered } = require('@_koii/namespace-wrapper');;

// Example: Logging a message
namespaceWrapper.logger('log', 'This is a log message');
```
## Environment Variables

You don't have to know these variables if you are using a Koii Node template.

- TASK_NAME: Name of the task.
- TASK_ID: ID of the task.
- EXPRESS_PORT: Port for the Express server.
- MAIN_ACCOUNT_PUBKEY: Main account public key of the task node.
- SECRET_KEY: Secret key for authentication.
- K2_NODE_URL: URL of the K2 node.
- SERVICE_URL: Public task node endpoint.
- STAKE: Stake of the task node.
- TASK_NODE_PORT: Port used by the task node's Express server.

## Functions
### initializeDB()
Initializes the database. If running in development mode, it creates a local database.

### getDb()
Returns the database instance. Initializes the database if it is not already initialized.

### storeGet(key)
Retrieves a value from the database for a given key.

### storeSet(key, value)
Sets a value in the database for a given key.

### fs(method, path, ...args)
Wrapper for file system operations. Calls the corresponding fsPromises method if running in development mode.

### fsStaking(method, path, ...args)
Wrapper for file system operations related to staking. Calls the corresponding fsPromises method if running in development mode.

### fsWriteStream(imagepath)
Creates a write stream for a given path.

### fsReadStream(imagepath)
Creates a read stream for a given path.

### getSlot()
Retrieves the current slot. Returns a dummy value if running in development mode.

### payloadSigning(body)
Signs a payload with the task's secret key.

### bs58Encode(data)
Encodes data to Base58 format.

### bs58Decode(data)
Decodes data from Base58 format.

### decodePayload(payload)
Decodes a payload from a Uint8Array to a string.

### verifySignature(signedMessage, pubKey)
Verifies the signature of a signed message.

### stakeOnChain(taskStateInfoPublicKey, stakingAccKeypair, stakePotAccount, stakeAmount)
Handles staking on the blockchain.

### claimReward(stakePotAccount, beneficiaryAccount, claimerKeypair)
Claims a reward from the stake pot account.

### sendTransaction(serviceNodeAccount, beneficiaryAccount, amount)
Sends a transaction.

### getSubmitterAccount()
Returns the submitter account keypair.

### sendAndConfirmTransactionWrapper(transaction, signers)
Wrapper for sending and confirming a transaction.

### getTaskState(options)
Retrieves the current task state.

### logMessage(level, message, action)
Logs a message at a specified log level.

### logger(level, message, action)
Logs a message using the logger function.

### auditSubmission(candidatePubkey, isValid, voterKeypair, round)
Audits a submission.

### distributionListAuditSubmission(candidatePubkey, isValid, voterKeypair, round)
Audits a distribution list submission.

### getRound()
Retrieves the current round.

### payoutTrigger(round)
Triggers a payout for a given round.

### uploadDistributionList(distributionList, round)
Uploads a distribution list for a given round.

### distributionListSubmissionOnChain(round)
Submits a distribution list on-chain for a given round.

### checkSubmissionAndUpdateRound(submissionValue, round)
Checks a submission and updates the round.

### getProgramAccounts()
Retrieves program accounts.

### defaultTaskSetup()
Sets up a default task state for testing.

### getRpcUrl()
Retrieves the RPC URL.

### getNodes(url)
Retrieves nodes from a given URL.

### getDistributionList(publicKey, round)
Retrieves a distribution list for a given public key and round.

### getTaskSubmissionInfo(round, forcefetch)
Retrieves task submission info for a given round.

### validateAndVoteOnNodes(validate, round)
Validates and votes on nodes.

### getTaskDistributionInfo(round)
Retrieves task distribution info for a given round.

### validateAndVoteOnDistributionList(validateDistribution, round, isPreviousRoundFailed)
Validates and votes on a distribution list.

### getTaskNodeVersion()
Retrieves the task node version.

### getTaskLevelDBPath()
Retrieves the task level DB path.

### getBasePath()
Retrieves the base path.

### getAverageSlotTime()
Retrieves the average slot time.

### nodeSelectionDistributionList(round, isPreviousFailed)
Selects a node for the distribution list.

### selectAndGenerateDistributionList(submitDistributionList, round, isPreviousRoundFailed)
Selects and generates a distribution list.

### getMainAccountPubkey()
Returns the main account public key.

## License
This package is licensed under the MIT License. See the LICENSE file for details.

## Support
For support, please contact Koii Network through Discord or Email. 





