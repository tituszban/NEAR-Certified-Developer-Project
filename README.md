# Donation-DAO

This is a micro-DAO smart contract developed for the NEAR Certified Developer certification

This DAO does one very simple thing: accept donations in NEAR and distribute it among the beneficiaries.

It is a micro-DAO, as it doesn't have any advanced features, such as governance tokens, instead it's a simple membership + voting system.

# Beneficiaries

A beneficiary is a NEAR account, the associated shares of the donation and if the beneficiary is an authoriser.

Donations are distributed among all beneficiaries proportionately to their respective shares (`individual shares / total shares`). If the donation cannot be divied equally, the first beneficiary receives a higher amount.

Authorisers are people who can vote on proposals to change the beneficiaries.

The contract starts with a single beneficiary, the owner of the contract, who has 100 shares and is an authoriser.

# Proposals

A proposal is a request to change the beneficiaries in some way. Each proposal has a deadline by which it must pass.

Anyone can submit a proposal. However, only authorisers can have more than one proposal active at a time.

New proposals must be valid even after any of the previous proposals pass or fail. For example two proposals can't run in parallel, one updating a beneficiary who was added with the other.

Proposals must be finalised for them to be applied. If at finalisation, a proposal has enough votes to pass, it is applied. If the deadline has passed, and it doesn't have enough votes, it fails and is not applied.

Proposals pass with a simple majority of the authorisers voting for them.

# Testing

All classes are covered with unit tests, found in the \_\_tests\_\_ folder.

Also included a python script that uses the NEAR CLI to drive the contract. It requires an owner and user accounts to be passed in. It performs the following steps:

 - Build and deploy
 - Register the owner
 - Get current beneficiaries
 - Donate 1 NEAR
 - Create a proposal to add the user as a beneficiary
 - Get current list of proposals
 - Approve the proposal as owner
 - Finalise proposals to apply change
 - Confirm that proposal is gone from the list of active proposals and that user has been added as a beneficiary
 - Donate to the two users
 - Delete the contract

It requires Python 3.8 or above. It doesn't use any additional packages.

Run it like this, from the root folder, replacing owner and user with valid accounts.

```sh
python3 ./scripts/drive_contract.py <OWNER> <USER>
```

Example:

```sh
python3 ./scripts/drive_contract.py tituszban.testnet dev1.tituszban.testnet
```