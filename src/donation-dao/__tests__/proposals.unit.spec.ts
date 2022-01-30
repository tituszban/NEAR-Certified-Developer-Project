import { VMContext, u128 } from "near-sdk-as";
import { ONE_NEAR } from "../../utils";

import { AddBeneficiaryProposal, RemoveBeneficiaryProposal, UpdateBeneficiaryProposal, Member, Vector, Proposal } from "../assembly/models";

const owner = "tb";
const user1 = "user1";
let proposal: Proposal

describe("AddBeneficiaryProposal.apply_proposal", () => {

    it("adds member if not already present", () => {
        proposal = new AddBeneficiaryProposal(0, user1, 10, false);

        const members = proposal.apply_proposal([
            new Member(owner, 100, true)
        ]);

        expect(members).toHaveLength(2);

        const newMember = members[1];

        expect(newMember.account).toBe(user1);
        expect(newMember.share).toBe(10);
        expect(newMember.isAuthoriser).toBe(false);
    })

    it("throws if member already present", () => {
        proposal = new AddBeneficiaryProposal(0, owner, 100, false);

        expect(() => {
            proposal.apply_proposal([new Member(owner, 100, true)])
        }).toThrow();
    })
})

describe("RemoveBeneficiaryProposal.apply_proposal", () => {

    it("removes member if already present", () => {
        proposal = new RemoveBeneficiaryProposal(0, user1);

        const members = proposal.apply_proposal([
            new Member(owner, 100, true),
            new Member(user1, 10, false)
        ]);

        expect(members).toHaveLength(1);
    })

    it("removing the only member throws", () => {
        proposal = new RemoveBeneficiaryProposal(0, owner);

        expect(() => {
            proposal.apply_proposal([
                new Member(owner, 100, true),
            ]);
        }).toThrow();
    })

    it("removing the only authoriser throws", () => {
        proposal = new RemoveBeneficiaryProposal(0, owner);

        expect(() => {
            proposal.apply_proposal([
                new Member(owner, 100, true),
                new Member(user1, 10, false)
            ]);
        }).toThrow();
    })

    it("throws if member not present", () => {
        proposal = new RemoveBeneficiaryProposal(0, user1);

        expect(() => {
            proposal.apply_proposal([new Member(owner, 100, true)])
        }).toThrow();
    })
})

describe("UpdateBeneficiaryProposal.apply_proposal", () => {

    it("updates user share", () => {
        proposal = new UpdateBeneficiaryProposal(0, user1, 100, true);

        const members = proposal.apply_proposal([
            new Member(owner, 100, true),
            new Member(user1, 10, false)
        ]);

        expect(members).toHaveLength(2);

        const updatedMember = members[1];
        expect(updatedMember.share).toBe(100);
        expect(updatedMember.isAuthoriser).toBe(true);
    })

    it("throws if member not present", () => {
        proposal = new UpdateBeneficiaryProposal(0, user1, 100, false);

        expect(() => {
            proposal.apply_proposal([new Member(owner, 100, true)])
        }).toThrow();
    })

    it("throws if only authoriser becomes not authoriser", () => {
        proposal = new UpdateBeneficiaryProposal(0, owner, 100, false);

        expect(() => {
            proposal.apply_proposal([new Member(owner, 100, true)])
        }).toThrow();
    })
})