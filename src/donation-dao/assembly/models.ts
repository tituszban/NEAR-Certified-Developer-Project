import { u128, PersistentVector, u256 } from "near-sdk-as";
import { AccountId } from "../../utils";


const BENEFICIARIES_VECTOR: string = "beneficiaries";
const PROPOSALS_VECTOR: string = "proposals";

function to_array<T>(v: PersistentVector<T>): Array<T> {
  const result = new Array<T>();
  for (let i = 0; i < v.length; i++) {
    result.push(v[i]);
  }
  return result;
}

function clear<T>(v: PersistentVector<T>): void {
  while (v.length > 0) {
    v.pop();
  }
}

@nearBindgen
export class Beneficiaries {
  private members: PersistentVector<Member> = new PersistentVector<Member>(BENEFICIARIES_VECTOR);

  constructor(initialUser: AccountId) {
    this.members.pushBack(new Member(initialUser, 100, true));
  }

  get_members(): Array<Member> {
    return to_array(this.members);
  }

  get_donation_shares(donation: u128): Array<DonationShare> {
    let totalShares = u128.from(this.get_total_shares());
    let result: Array<DonationShare> = [];

    for (let i = this.members.length - 1; i >= 0; i--) {
      const member = this.members[i];
      let memberShare: u128;
      if (i == 0) {
        memberShare = donation;
      } else {
        const memberShares = u128.from(member.share);
        memberShare = u128.div(u128.mul(donation, u128.from(memberShares)), totalShares);
        donation = u128.sub(donation, memberShare);
        totalShares = u128.sub(totalShares, memberShares);
      }
      result.push(new DonationShare(member.account, memberShare));
    }

    return result.reverse();
  }

  private get_total_shares(): u64 {
    let initial: u64 = 0;
    return this.get_members().reduce((sum, member) => sum + member.share, initial);
  }

  apply_proposal(proposal: Proposal): void {
    const applyResult = proposal.apply_proposal(this.get_members());
    assert(applyResult.success, applyResult.error);
    const newMembers = applyResult.updatedMembers;

    // TODO: more intelligent/efficient merge
    clear(this.members);
    for (let i = 0; i < newMembers.length; i++) {
      this.members.push(newMembers[i]);
    }
  }

  is_member(account: AccountId): boolean {
    for (let i = 0; i < this.members.length; i++) {
      if (this.members[i].account == account) {
        return true;
      }
    }
    return false;
  }

  is_authoriser(account: AccountId): boolean {
    for (let i = 0; i < this.members.length; i++) {
      if (this.members[i].account == account) {
        return this.members[i].isAuthoriser;
      }
    }
    return false;
  }
}


@nearBindgen
export class DonationShare {
  constructor(
    public account: AccountId,
    public share: u128
  ) { }
}

@nearBindgen
export class Member {

  constructor(
    public account: AccountId,
    public share: u64,
    public isAuthoriser: boolean
  ) {

  }
}

@nearBindgen
export class Proposals {
  private proposals: PersistentVector<SerialiseableProposal> = new PersistentVector<SerialiseableProposal>(PROPOSALS_VECTOR);
  private beneficiaries: Beneficiaries;

  constructor(beneficiaries: Beneficiaries) {
    this.beneficiaries = beneficiaries;
  }

  get_active_proposals(): Array<Proposal> {
    const result: Array<Proposal> = [];

    for (let i = 0; i < this.proposals.length; i++) {
      if (this.proposals[i].isActive) {
        result.push(this.proposals[i].to_proposal());
      }
    }
    return result;
  }

  get_all_proposals(): Array<Proposal> {
    return to_array(this.proposals).map<Proposal>(p => p.to_proposal());
  }

  finalise_proposals(currentTime: u64): Array<ProposalResult> {
    const completedProposals: Array<ProposalResult> = [];
    for (let i = 0; i < this.proposals.length; i++) {
      const proposal = this.proposals[i].to_proposal();
      const proposalPassed = proposal.did_pass(this.beneficiaries.get_members());
      if (proposal.deadline < currentTime || proposalPassed) {
        proposal.isActive = false;
        this.proposals.replace(i, proposal.to_serialiseable())
        completedProposals.push(new ProposalResult(proposal, proposalPassed));
      }
    }
    return completedProposals;
  }

  create_add_beneficiary_proposal(currentTime: u64, deadline: u64, createdBy: AccountId, account: AccountId, share: u64, isAuthoriser: boolean): Proposal {
    assert(currentTime < deadline, "Deadline must be in the future");
    const proposal = new AddBeneficiaryProposal(this.proposals.length, deadline, createdBy, account, share, isAuthoriser);
    this._add_proposal(proposal);
    return proposal;
  }

  create_remove_beneficiary_proposal(currentTime: u64, deadline: u64, createdBy: AccountId, account: AccountId): Proposal {
    assert(currentTime < deadline, "Deadline must be in the future");
    const proposal = new RemoveBeneficiaryProposal(this.proposals.length, deadline, createdBy, account);
    this._add_proposal(proposal);
    return proposal;
  }

  create_update_beneficiary_proposal(currentTime: u64, deadline: u64, createdBy: AccountId, account: AccountId, share: u64, isAuthoriser: boolean): Proposal {
    assert(currentTime < deadline, "Deadline must be in the future");
    const proposal = new AddBeneficiaryProposal(this.proposals.length, deadline, createdBy, account, share, isAuthoriser);
    this._add_proposal(proposal);
    return proposal;
  }

  vote_on_proposal(currentTime: u64, account: AccountId, proposalId: u32): u32 {
    assert(this.beneficiaries.is_authoriser(account), "Account must be a known authoriser");
    assert((proposalId as i32) < this.proposals.length, "Proposal not found");
    const proposal = this.proposals[proposalId].to_proposal();
    assert(currentTime < proposal.deadline, "Proposal deadline has passed");
    assert(proposal.isActive, "Proposal has been finalised");

    const voteCount = proposal.vote(account);
    this.proposals.replace(proposalId, proposal.to_serialiseable());
    return voteCount;
  }

  private _add_proposal(proposal: Proposal): void {
    const activeProposals = this.get_active_proposals()

    if (!this.beneficiaries.is_authoriser(proposal.createdBy)) {
      for (let i = 0; i < activeProposals.length; i++) {
        assert(activeProposals[i].createdBy != proposal.createdBy, "Non authorisers can only have one proposal active at a time")
      }
    }

    const validationResult = this._validate_active_proposals(activeProposals, proposal);
    assert(validationResult.success, validationResult.error);

    this.proposals.push(proposal.to_serialiseable());
  }

  private _validate_active_proposals(active_proposals: Array<Proposal>, new_proposal: Proposal): ProposalValidationResult {
    const initial_members: Array<Member> = this.beneficiaries.get_members()

    for (let i = 0; i < (1 << active_proposals.length); i++) {
      let currentMembers = initial_members.map<Member>(m => m);
      for (let j = 0; j < active_proposals.length; j++) {
        if (i & (1 << j)) {
          let result = active_proposals[i].apply_proposal(currentMembers);
          if(!result.success) {
            return new ProposalValidationResult(false, `${i}/${j}: ${result.error}`);
          }
          currentMembers = result.updatedMembers;
        }
      }
      let result = new_proposal.apply_proposal(currentMembers);
      if(!result.success){
        return new ProposalValidationResult(false, `${i}/n: ${result.error}`);
      }
    }
    
    return new ProposalValidationResult(true, "");
  }
}


@nearBindgen
export class SerialiseableProposal {   // Ugly hack for https://stackoverflow.com/questions/70916471/does-persistentvector-not-support-child-classes
  constructor(
    public proposalType: string,
    public votes: Array<AccountId>,
    public isActive: boolean,
    public proposalId: u32,
    public deadline: u64,
    public createdBy: AccountId,
    public account: AccountId,
    public share: u64,
    public isAuthoriser: boolean
  ) { }

  to_proposal(): Proposal {
    let proposal: Proposal;
    if (this.proposalType == "add") {
      proposal = new AddBeneficiaryProposal(this.proposalId, this.deadline, this.createdBy, this.account, this.share, this.isAuthoriser);
    } else if (this.proposalType == "remove") {
      proposal = new RemoveBeneficiaryProposal(this.proposalId, this.deadline, this.createdBy, this.account);
    } else if (this.proposalType == "update") {
      proposal = new UpdateBeneficiaryProposal(this.proposalId, this.deadline, this.createdBy, this.account, this.share, this.isAuthoriser);
    } else {
      throw new Error(`Unknown type ${this.proposalType}`);
    }
    proposal.votes = this.votes;
    proposal.isActive = this.isActive;
    return proposal;
  }
}

@nearBindgen
export class ProposalAppliedResult {
  constructor(
    public success: boolean,
    public error: string,
    public updatedMembers: Array<Member>
  ) { }
}

@nearBindgen
export class ProposalValidationResult {
  constructor(
    public success: boolean,
    public error: string
  ) { }
}

@nearBindgen
export abstract class Proposal {
  public votes: Array<AccountId>;
  public isActive: boolean;
  constructor(
    public proposalId: u32,
    public deadline: u64,
    public createdBy: AccountId
  ) {
    this.votes = [];
    this.isActive = true;
  }

  abstract apply_proposal(members: Array<Member>): ProposalAppliedResult;

  abstract to_serialiseable(): SerialiseableProposal;

  abstract describe(): string;

  protected verify_members_integiry(members: Array<Member>): ProposalAppliedResult {
    if (members.length <= 0) {
      return new ProposalAppliedResult(false, "No members present", members);
    }
    if (members.filter(member => member.isAuthoriser).length <= 0) {
      return new ProposalAppliedResult(false, "No Authorisers present", members);
    }

    let initialShares: u64 = 0;
    if (members.reduce((s, member) => s + member.share, initialShares) <= 0) {
      return new ProposalAppliedResult(false, "Total shares are 0", members);
    }

    return new ProposalAppliedResult(true, "", members);
  }

  did_pass(members: Array<Member>): boolean {
    return this.votes.length > (members.filter(m => m.isAuthoriser).length / 2);
  }

  vote(account: AccountId): u32 {
    for (let i = 0; i < this.votes.length; i++) {
      assert(this.votes[i] != account, "This account has already voted")
    }
    this.votes.push(account);
    return this.votes.length;
  }

  protected _describe_base(): string {
    return `Proposal #${this.proposalId} (Created by ${this.createdBy}, Deadline: ${this.deadline}; ${this.isActive ? "Active" : "Inactive"})`
  }
}

@nearBindgen
export class AddBeneficiaryProposal extends Proposal {

  constructor(
    proposalId: u32,
    deadline: u64,
    createdBy: AccountId,
    public account: AccountId,
    public share: u64,
    public isAuthoriser: boolean
  ) {
    super(proposalId, deadline, createdBy);
  }

  apply_proposal(members: Array<Member>): ProposalAppliedResult {
    const result: Array<Member> = [];
    for (let i = 0; i < members.length; i++) {
      if (members[i].account == this.account) {
        return new ProposalAppliedResult(false, "Member already present", members);
      }
      result.push(members[i])
    }

    result.push(new Member(this.account, this.share, this.isAuthoriser));

    return this.verify_members_integiry(result)
  }

  to_serialiseable(): SerialiseableProposal {
    return new SerialiseableProposal(
      "add",
      this.votes,
      this.isActive,
      this.proposalId,
      this.deadline,
      this.createdBy,
      this.account,
      this.share,
      this.isAuthoriser
    )
  }

  describe(): string {
    return `${this._describe_base()}: Add new beneficiary: ${this.account} with a share of ${this.share} as ${this.isAuthoriser ? "Authoriser" : "Non-authoriser"}`
  }
}

@nearBindgen
export class RemoveBeneficiaryProposal extends Proposal {
  constructor(
    proposalId: u32,
    deadline: u64,
    createdBy: AccountId,
    public account: AccountId,
  ) {
    super(proposalId, deadline, createdBy);
  }

  apply_proposal(members: Array<Member>): ProposalAppliedResult {
    const result: Array<Member> = [];
    for (let i = 0; i < members.length; i++) {
      if (members[i].account != this.account) {
        result.push(members[i]);
      }
    }
    if (result.length == members.length) {
      return new ProposalAppliedResult(false, "Removed member is not a member", members);
    }

    return this.verify_members_integiry(result);
  }

  to_serialiseable(): SerialiseableProposal {
    return new SerialiseableProposal(
      "remove",
      this.votes,
      this.isActive,
      this.proposalId,
      this.deadline,
      this.createdBy,
      this.account,
      0, false
    )
  }

  describe(): string {
    return `${this._describe_base()}: Remove beneficiary: ${this.account}`
  }
}

@nearBindgen
export class UpdateBeneficiaryProposal extends Proposal {

  constructor(
    proposalId: u32,
    deadline: u64,
    createdBy: AccountId,
    public account: AccountId,
    public share: u64,
    public isAuthoriser: boolean
  ) {
    super(proposalId, deadline, createdBy)
  }

  apply_proposal(members: Array<Member>): ProposalAppliedResult {
    const result: Array<Member> = [];
    let updated = false;
    for (let i = 0; i < members.length; i++) {
      if (members[i].account != this.account) {
        result.push(members[i]);
      } else {
        updated = true;
        result.push(new Member(
          this.account,
          this.share,
          this.isAuthoriser
        ))
      }
    }
    if (!updated) {
      return new ProposalAppliedResult(false, "Updated member is not a member", members);
    }

    return this.verify_members_integiry(result);
  }

  to_serialiseable(): SerialiseableProposal {
    return new SerialiseableProposal(
      "update",
      this.votes,
      this.isActive,
      this.proposalId,
      this.deadline,
      this.createdBy,
      this.account,
      this.share,
      this.isAuthoriser
    )
  }

  describe(): string {
    return `${this._describe_base()}: Update beneficiary: ${this.account}; Share of ${this.share}; ${this.isAuthoriser ? "Authoriser" : "Non-authoriser"}`
  }
}

@nearBindgen
export class ProposalResult {
  constructor(
    public proposal: Proposal,
    public passed: boolean
  ) { }

  describe(): string {
    return `Proposal #${this.proposal.proposalId}: ${this.passed ? "PASSED" : "FAILED"}`
  }
}