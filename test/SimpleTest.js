const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Counter", function () {
  it("Should deploy and work correctly", async function () {
    const Counter = await ethers.getContractFactory("Counter");
    const counter = await Counter.deploy();
    await counter.waitForDeployment();

    // Test initial value
    expect(await counter.x()).to.equal(0);

    // Test increment
    await counter.inc();
    expect(await counter.x()).to.equal(1);

    // Test increment by value
    await counter.incBy(5);
    expect(await counter.x()).to.equal(6);
  });
});
