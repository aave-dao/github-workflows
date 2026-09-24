// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Example} from "../Example.sol";

contract TestB {
    function test_c() external {
        assert(new Example().value() == 1);
    }
}
