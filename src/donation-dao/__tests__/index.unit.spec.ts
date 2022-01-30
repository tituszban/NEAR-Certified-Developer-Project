import { VMContext, u128 } from "near-sdk-as";
import { ONE_NEAR } from "../../utils";

import { Contract } from "../assembly/index";

const contract = "donation.dao";
const owner = "tb";
const donating_user = "donating.user"

let donDao: Contract

beforeEach(() => {
    VMContext.setCurrent_account_id(contract);
    VMContext.setAccount_balance(ONE_NEAR); // resolves HostError(BalanceExceeded)
    donDao = new Contract(owner);
})

describe("Contract", () => {

    it("has owner as starting beneficiary", () => {
        const beneficiaries = donDao.get_beneficiaries();
        expect(beneficiaries).toHaveLength(1);
        expect(beneficiaries[0].account).toBe(owner);
        expect(beneficiaries[0].share).toBe(100);
        expect(beneficiaries[0].is_authoriser).toBe(true);
    });
})