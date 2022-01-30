import { u128, PersistentVector, u256 } from "near-sdk-as";
import { AccountId } from "../../utils";


const BENEFICIARIES_VECTOR: string = "beneficiaries";

export class Beneficiaries {
  private members: Vector<Member> = new Vector<Member>(BENEFICIARIES_VECTOR);

  constructor(initialUser: AccountId) {
    this.members.pushBack(new Member(initialUser, 100, true));
  }

  get_members(): Array<Member> {
    return this.members.to_array();
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
    return this.members.to_array().reduce((sum, member) => sum + member.share, initial);
  }

  apply_proposal(proposal: Proposal): void {
    const newMembers = proposal.apply_proposal(this.members.to_array());
    // TODO: more intelligent/efficient merge
    this.members.clear();
    for(let i = 0; i < newMembers.length; i++){
      this.members.push(newMembers[i]);
    }
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
export abstract class Proposal {
  public votes: u64;
  constructor(
    public readonly deadline: u64
  ) {
    this.votes = 0;
  }

  abstract apply_proposal(members: Array<Member>): Array<Member>;

  protected verify_members_integiry(members: Array<Member>): void {
    assert(members.length > 0, "There always must be members");
    assert(members.reduce((c, member) => c + (member.isAuthoriser ? 1 : 0), 0) > 0, "There always must be at least one authoriser")
    let initialShares: u64 = 0;
    assert(members.reduce((s, member) => s + member.share, initialShares) > 0, "Total shares must be greater than 0");
  }
}

@nearBindgen
export class AddBeneficiaryProposal extends Proposal {

  constructor(
    deadline: u64,
    public readonly account: AccountId,
    public readonly share: u64,
    public readonly is_authorizer: boolean
  ) {
    super(deadline);
  }

  apply_proposal(members: Array<Member>): Array<Member> {
    const result: Array<Member> = [];
    for (let i = 0; i < members.length; i++) {
      assert(members[i].account != this.account, "Added member must not already be a member")
      result.push(members[i])
    }

    result.push(new Member(this.account, this.share, this.is_authorizer));

    this.verify_members_integiry(result);

    return result;
  }
}

@nearBindgen
export class RemoveBeneficiaryProposal extends Proposal {
  constructor(
    deadline: u64,
    public readonly account: AccountId,
  ) {
    super(deadline);
  }

  apply_proposal(members: Array<Member>): Array<Member> {
    const result: Array<Member> = [];
    for (let i = 0; i < members.length; i++) {
      if (members[i].account != this.account) {
        result.push(members[i]);
      }
    }
    assert(result.length != members.length, "Removed member must be a member")

    this.verify_members_integiry(result);

    return result;
  }
}

@nearBindgen
export class UpdateBeneficiaryProposal extends Proposal {
  
  constructor(
    deadline: u64,
    public readonly account: AccountId,
    public readonly share: u64,
    public readonly isAuthoriser: boolean
  ) {
    super(deadline)
  }

  apply_proposal(members: Array<Member>): Array<Member> {
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
    assert(updated, "Updated member must be a member")

    this.verify_members_integiry(result);

    return result;
  }
}

@nearBindgen
export class Vector<T> extends PersistentVector<T> {

  to_array(): Array<T> {
    const result = new Array<T>();
    for (let i = 0; i < this.length; i++) {
      result.push(this[i]);
    }
    return result;
  }

  clear(): void {
    while (this.length > 0) {
      this.pop();
    }
  }
}