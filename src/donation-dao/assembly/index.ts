import { logging, Context, u128, ContractPromiseBatch, PersistentSet, PersistentVector, PromiseStatus } from "near-sdk-as";

import { AccountId, ONE_NEAR, asNEAR, XCC_GAS } from "../../utils";

import { Beneficiaries, Member, Vector } from "./models"

// max 5 NEAR accepted to this contract before it forces a transfer to the owners
const CONTRIBUTION_SAFETY_LIMIT: u128 = u128.mul(ONE_NEAR, u128.from(5));   // TODO: why is this needed?



@nearBindgen
export class Contract {
    private beneficiaries: Beneficiaries;

    constructor(owner: AccountId) {
        this.beneficiaries = new Beneficiaries(owner);
    }

    get_beneficiaries(): Array<Member> {
        return this.beneficiaries.get_members();
    }

    @mutateState()
    donate(): void {
        const donation = Context.attachedDeposit;
        this._assert_financial_safety_limits(donation)

        const donation_shares = this.beneficiaries.get_donation_shares(donation);

        donation_shares.forEach((share) => {
            let to_owner = ContractPromiseBatch.create(share.account);
            to_owner.transfer(share.share);
        })
    }

    // TODO: DAO proposals:
    //  - Add beneficiary (share, is_authorizer)
    //  - Remove beneficiary
    //  - Change user share
    //  - Change user is_authorizer
    // All have time limits.
    // Voting options:
    //  - Get proposals
    //  - Support proposals
    //  - Reject proposal
    // Check if proposal has applied on all actions


    private _assert_financial_safety_limits(deposit: u128): void {  // SOURCE: https://github.com/Learn-NEAR/NCD.L1.sample--thanks/blob/main/src/thanks/assembly/index.ts
        assert(u128.le(deposit, CONTRIBUTION_SAFETY_LIMIT), "You are trying to attach too many NEAR Tokens to this call.  There is a safe limit while in beta of 5 NEAR")
    }
}