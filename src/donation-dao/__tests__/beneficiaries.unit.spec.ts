import { VMContext, u128 } from "near-sdk-as";
import { ONE_NEAR } from "../../utils";

import { Member, Beneficiaries, AddBeneficiaryProposal, UpdateBeneficiaryProposal } from "../assembly/models";

const owner = "tb";
const user1 = "user1";
const user2 = "user2";

let beneficiaries: Beneficiaries

beforeEach(() => {
    beneficiaries = new Beneficiaries(owner);
})

describe("Beneficiaries.get_donation_shares", () => {

    it("only owner created gets all shares", () => {
        let donation = u128.mul(ONE_NEAR, u128.from(1));
        let shares = beneficiaries.get_donation_shares(donation);

        expect(shares).toHaveLength(1);

        let ownerShare = shares[0];
        expect(ownerShare.account).toBe(owner);
        expect(ownerShare.share).toBe(donation);
    })

    it("multiple owners with same shares get equal amount", () => {
        beneficiaries.apply_proposal(new AddBeneficiaryProposal(0, 0, user1, 100, false));

        let donation = u128.mul(ONE_NEAR, u128.from(1));
        let expectedDonation = u128.div(ONE_NEAR, u128.from(2));
        let shares = beneficiaries.get_donation_shares(donation);

        expect(shares).toHaveLength(2);
        expect(shares[0].share).toBe(expectedDonation);
        expect(shares[1].share).toBe(expectedDonation);
    })

    it("multiple owners with different shares get different amount", () => {
        beneficiaries.apply_proposal(new UpdateBeneficiaryProposal(0, 0, owner, 75, true));
        beneficiaries.apply_proposal(new AddBeneficiaryProposal(0, 0, user1, 25, false));

        let donation = ONE_NEAR;
        let expectedDonation1 = u128.div(u128.mul(ONE_NEAR, u128.from(3)), u128.from(4));
        let expectedDonation2 = u128.div(ONE_NEAR, u128.from(4));
        let shares = beneficiaries.get_donation_shares(donation);

        expect(shares).toHaveLength(2);
        expect(u128.add(shares[0].share, shares[1].share)).toBe(ONE_NEAR);
        expect(shares[0].share).toBe(expectedDonation1);
        expect(shares[1].share).toBe(expectedDonation2);
    })

    it("uneven division first member gets more", () => {
        beneficiaries.apply_proposal(new AddBeneficiaryProposal(0, 0, user1, 100, false));
        beneficiaries.apply_proposal(new AddBeneficiaryProposal(0, 0, user2, 100, false));

        let donation = ONE_NEAR;
        let expectedDonation = u128.div(ONE_NEAR, u128.from(3));
        let shares = beneficiaries.get_donation_shares(donation);

        expect(shares).toHaveLength(3);

        const totalShares = shares.reduce((s, m) => u128.add(s, m.share), u128.from(0));

        expect(totalShares).toBe(ONE_NEAR);
        expect(shares[0].share).toBe(u128.add(expectedDonation, u128.from(1)));
        expect(shares[1].share).toBe(expectedDonation);
        expect(shares[2].share).toBe(expectedDonation);
    })
})

