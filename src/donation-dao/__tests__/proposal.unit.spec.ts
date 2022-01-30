import { VMContext, u128 } from "near-sdk-as";

import { AddBeneficiaryProposal, RemoveBeneficiaryProposal, UpdateBeneficiaryProposal, Member, Vector, Proposal } from "../assembly/models";

const owner = "tb";
const user1 = "user1";
let proposal: Proposal

describe("AddBeneficiaryProposal.apply_proposal", () => {

    it("adds member if not already present", () => {
        proposal = new AddBeneficiaryProposal(0, 0, owner, user1, 10, false);

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
        proposal = new AddBeneficiaryProposal(0, 0, owner, owner, 100, false);

        expect(() => {
            proposal.apply_proposal([new Member(owner, 100, true)])
        }).toThrow();
    })
})

describe("RemoveBeneficiaryProposal.apply_proposal", () => {

    it("removes member if already present", () => {
        proposal = new RemoveBeneficiaryProposal(0, 0, owner, user1);

        const members = proposal.apply_proposal([
            new Member(owner, 100, true),
            new Member(user1, 10, false)
        ]);

        expect(members).toHaveLength(1);
    })

    it("removing the only member throws", () => {
        proposal = new RemoveBeneficiaryProposal(0, 0, owner, owner);

        expect(() => {
            proposal.apply_proposal([
                new Member(owner, 100, true),
            ]);
        }).toThrow();
    })

    it("removing the only authoriser throws", () => {
        proposal = new RemoveBeneficiaryProposal(0, 0, owner, owner);

        expect(() => {
            proposal.apply_proposal([
                new Member(owner, 100, true),
                new Member(user1, 10, false)
            ]);
        }).toThrow();
    })

    it("throws if member not present", () => {
        proposal = new RemoveBeneficiaryProposal(0, 0, owner, user1);

        expect(() => {
            proposal.apply_proposal([new Member(owner, 100, true)])
        }).toThrow();
    })
})

describe("UpdateBeneficiaryProposal.apply_proposal", () => {

    it("updates user share", () => {
        proposal = new UpdateBeneficiaryProposal(0, 0, owner, user1, 100, true);

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
        proposal = new UpdateBeneficiaryProposal(0, 0, owner, user1, 100, false);

        expect(() => {
            proposal.apply_proposal([new Member(owner, 100, true)])
        }).toThrow();
    })

    it("throws if only authoriser becomes not authoriser", () => {
        proposal = new UpdateBeneficiaryProposal(0, 0, owner, owner, 100, false);

        expect(() => {
            proposal.apply_proposal([new Member(owner, 100, true)])
        }).toThrow();
    })
})

describe("AddBeneficiaryProposal.to_serialiseable", () => {
    it("is reversable", () => {
        proposal = new AddBeneficiaryProposal(0, 0, owner, owner, 100, true);
        const aProposal: AddBeneficiaryProposal = proposal as AddBeneficiaryProposal;

        const sProposal = proposal.to_serialiseable().to_proposal();

        expect(sProposal.proposalId).toBe(proposal.proposalId);
        expect(sProposal.votes).toBe(proposal.votes);
        expect(sProposal.isActive).toBe(proposal.isActive);
        const asProposal: AddBeneficiaryProposal = sProposal as AddBeneficiaryProposal;
        expect(asProposal.account).toBe(aProposal.account);
        expect(asProposal.share).toBe(aProposal.share);
        expect(asProposal.isAuthoriser).toBe(aProposal.isAuthoriser);

    })
})

describe("RemoveBeneficiaryProposal.to_serialiseable", () => {
    it("is reversable", () => {
        proposal = new RemoveBeneficiaryProposal(0, 0, owner, owner);
        const aProposal: RemoveBeneficiaryProposal = proposal as RemoveBeneficiaryProposal;

        const sProposal = proposal.to_serialiseable().to_proposal();

        expect(sProposal.proposalId).toBe(proposal.proposalId);
        expect(sProposal.votes).toBe(proposal.votes);
        expect(sProposal.isActive).toBe(proposal.isActive);
        const asProposal: RemoveBeneficiaryProposal = sProposal as RemoveBeneficiaryProposal;
        expect(asProposal.account).toBe(aProposal.account);
    })
})

describe("UpdateBeneficiaryProposal.to_serialiseable", () => {
    it("is reversable", () => {
        proposal = new UpdateBeneficiaryProposal(0, 0, owner, owner, 100, true);
        const aProposal: UpdateBeneficiaryProposal = proposal as UpdateBeneficiaryProposal;

        const sProposal = proposal.to_serialiseable().to_proposal();

        expect(sProposal.proposalId).toBe(proposal.proposalId);
        expect(sProposal.votes).toBe(proposal.votes);
        expect(sProposal.isActive).toBe(proposal.isActive);
        const asProposal: UpdateBeneficiaryProposal = sProposal as UpdateBeneficiaryProposal;
        expect(asProposal.account).toBe(aProposal.account);
        expect(asProposal.share).toBe(aProposal.share);
        expect(asProposal.isAuthoriser).toBe(aProposal.isAuthoriser);

    })
})