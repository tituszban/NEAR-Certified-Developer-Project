import { VMContext } from "near-sdk-as";
import { ONE_NEAR } from "../../utils";

import { Contract } from "../assembly/index";

const contract = "donation-dao"
const owner = "tb"

let donDao: Contract

beforeEach(() => {
    VMContext.setCurrent_account_id(contract)
    VMContext.setAccount_balance(ONE_NEAR) // resolves HostError(BalanceExceeded)
    donDao = new Contract(owner)
  })

describe("Contract", () => {

    it("can be initialized with owner", () => {
        expect(donDao.get_owner()).toBe(owner)
    });
})