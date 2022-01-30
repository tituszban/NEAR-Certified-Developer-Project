import { logging, Context, u128, ContractPromiseBatch, PersistentSet, PersistentVector, PromiseStatus } from "near-sdk-as";

import { AccountId, ONE_NEAR, asNEAR, XCC_GAS } from "../../utils";

import { Beneficiaries, Member, Proposal, Proposals } from "./models"

// max 5 NEAR accepted to this contract before it forces a transfer to the owners
const CONTRIBUTION_SAFETY_LIMIT: u128 = u128.mul(ONE_NEAR, u128.from(5));   // TODO: why is this needed?


@nearBindgen
export class Contract {
    private beneficiaries: Beneficiaries;
    private proposals: Proposals;

    constructor(owner: AccountId) {
        this.beneficiaries = new Beneficiaries(owner);  // TODO: this doesn't work
        this.proposals = new Proposals(this.beneficiaries);
    }

    get_beneficiaries(): Array<Member> {
        return this.beneficiaries.get_members();
    }

    donate(): void {
        const donation = Context.attachedDeposit;
        this._assert_financial_safety_limits(donation)

        const donation_shares = this.beneficiaries.get_donation_shares(donation);

        donation_shares.forEach((share) => {
            let to_owner = ContractPromiseBatch.create(share.account);
            to_owner.transfer(share.share);
        })
    }

    get_proposals(activeOnly: boolean): Array<string> {
        return activeOnly
            ? this.proposals.get_active_proposals().map<string>(p => p.describe())
            : this.proposals.get_all_proposals().map<string>(p => p.describe())
    }

    @mutateState()
    approve_proposal(proposalId: u32): u32 {
        return this.proposals.vote_on_proposal(Context.blockTimestamp, Context.sender, proposalId);
    }

    @mutateState()
    finalise_proposals(): Array<String> {
        return this.proposals.finalise_proposals(Context.blockTimestamp).map<string>(r => r.describe());
    }

    @mutateState()
    create_add_beneficiary_proposal(deadline: number, account: AccountId, share: number, isAuthoriser: boolean): string {
        return this.proposals.create_add_beneficiary_proposal(Context.blockTimestamp, deadline as u64, Context.sender, account, share as u64, isAuthoriser).describe();
    }

    @mutateState()
    create_remove_beneficiary_proposal(deadline: number, account: AccountId): string {
        return this.proposals.create_remove_beneficiary_proposal(Context.blockTimestamp, deadline as u64, Context.sender, account).describe();
    }

    @mutateState()
    create_update_beneficiary_proposal(deadline: number, account: AccountId, share: number, isAuthoriser: boolean): string {
        return this.proposals.create_update_beneficiary_proposal(Context.blockTimestamp, deadline as u64, Context.sender, account, share as u64, isAuthoriser).describe();
    }

    private _assert_financial_safety_limits(deposit: u128): void {  // SOURCE: https://github.com/Learn-NEAR/NCD.L1.sample--thanks/blob/main/src/thanks/assembly/index.ts
        assert(u128.le(deposit, CONTRIBUTION_SAFETY_LIMIT), "You are trying to attach too many NEAR Tokens to this call.  There is a safe limit while in beta of 5 NEAR")
    }
}