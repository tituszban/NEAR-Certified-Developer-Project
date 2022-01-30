import { u128 } from "near-sdk-as";

import { AddBeneficiaryProposal, Beneficiaries, Proposal, Proposals } from "../assembly/models";

const owner = "tb";
const user1 = "user1";
const user2 = "user2";

let proposals: Proposals;
let beneficiaries: Beneficiaries;

beforeEach(() => {
    proposals = new Proposals();
    beneficiaries = new Beneficiaries(owner);
    beneficiaries.apply_proposal(new AddBeneficiaryProposal(0, 0, user1, 10, false))
})

describe("create_add_beneficiary_proposal", () => {
    it("has the correct fields", () => {
        const createdProposal = proposals.create_add_beneficiary_proposal(0, 10, owner, 1000, true);

        expect(createdProposal.deadline).toBe(10);
        expect(createdProposal.proposalId).toBe(0);
        expect(createdProposal.votes).toHaveLength(0);
    })
});

describe("get_active_proposals", () => {
    it("is empty after init", () => {
        const activeProposals = proposals.get_active_proposals();

        expect(activeProposals).toHaveLength(0);
    })

    it("has proposals after proposal added", () => {
        proposals.create_add_beneficiary_proposal(0, 10, owner, 1000, true);

        const activeProposals = proposals.get_active_proposals();

        expect(activeProposals).toHaveLength(1);

        const activeProposal = activeProposals[0];

        expect(activeProposal.deadline).toBe(10);
        expect(activeProposal.proposalId).toBe(0);
        expect(activeProposal.votes).toHaveLength(0);
    })
});

describe("vote_on_proposal", () => {
    it("adds vote to proposal", () => {
        proposals.create_add_beneficiary_proposal(0, 10, owner, 1000, true);
        const voteCount = proposals.vote_on_proposal(1, owner, 0, beneficiaries);

        expect(voteCount).toBe(1);

        const proposal = proposals.get_active_proposals()[0];

        expect(proposal.votes).toHaveLength(1);
    })

    it("duplicate vote throws", () => {
        proposals.create_add_beneficiary_proposal(0, 10, owner, 1000, true);
        proposals.vote_on_proposal(1, owner, 0, beneficiaries);
        expect(() => {
            proposals.vote_on_proposal(2, owner, 0, beneficiaries);
        }).toThrow()
    })

    it("not authoriser vote throws", () => {
        proposals.create_add_beneficiary_proposal(0, 10, owner, 1000, true);
        expect(() => {
            proposals.vote_on_proposal(2, user1, 0, beneficiaries);
        }).toThrow()
    })

    it("non-existent user vote throws", () => {
        proposals.create_add_beneficiary_proposal(0, 10, owner, 1000, true);
        expect(() => {
            proposals.vote_on_proposal(2, user2, 0, beneficiaries);
        }).toThrow()
    })

    it("voting after deadline throws", () => {
        proposals.create_add_beneficiary_proposal(0, 10, owner, 1000, true);
        expect(() => {
            proposals.vote_on_proposal(20, owner, 0, beneficiaries);
        }).toThrow()
    })
});

describe("finalise_proposals", () => {
    it("sets expired proposals to inactive", () => {
        proposals.create_add_beneficiary_proposal(0, 10, owner, 1000, true);

        const finalisedProposals = proposals.finalise_proposals(20, beneficiaries);

        expect(finalisedProposals).toHaveLength(1);
        expect(finalisedProposals[0].proposalId).toBe(0);

        const activeProposals = proposals.get_active_proposals();

        expect(activeProposals).toHaveLength(0);

        const members = beneficiaries.get_members()
        expect(members).toHaveLength(2);
    })

    it("applies approved proposals", () => {
        proposals.create_add_beneficiary_proposal(0, 10, user2, 100, false);
        proposals.vote_on_proposal(5, owner, 0, beneficiaries);

        const finalisedProposals = proposals.finalise_proposals(20, beneficiaries);

        expect(finalisedProposals).toHaveLength(1);

        const activeProposals = proposals.get_active_proposals();

        expect(activeProposals).toHaveLength(0);

        const members = beneficiaries.get_members()
        expect(members).toHaveLength(3);
    })
})
