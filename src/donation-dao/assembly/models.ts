import { Context, u128, PersistentVector } from "near-sdk-as";
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

    return result;
  }

  private get_total_shares(): u64 {
    let initial: u64 = 0;
    return this.members.to_array().reduce((sum, member) => sum + member.share, initial);
  }

  apply_proposal(proposal: Proposal): void {

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
    public is_authoriser: boolean
  ) {

  }
}

@nearBindgen
export abstract class Proposal {
  public votes: u64;
  constructor(
    public deadline: u64

  ) {
    this.votes = 0;
  }

  abstract applyProposal(members: Array<Member>): Array<Member>;
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
}