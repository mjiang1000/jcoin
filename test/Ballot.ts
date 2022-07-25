import {expect} from "chai"
import hre from "hardhat"

import {loadFixture} from "@nomicfoundation/hardhat-network-helpers"
const formatBytes32String = hre.ethers.utils.formatBytes32String
const names = [formatBytes32String("apple"), formatBytes32String("orange"), formatBytes32String("banana")]
// console.log(names)
describe("Ballot", function() {
  async function getFixture() {
    const Ballot = await hre.ethers.getContractFactory("Ballot");
    const ballot = await Ballot.deploy(names)

    const [chairperson, ...voters] = await hre.ethers.getSigners()
    hre.ethers.utils.formatBytes32String
    return {ballot, Ballot, chairperson, voters}
  }

  it("right to vote", async function() {
    const {ballot, Ballot, voters} = await loadFixture(getFixture)
    
    const [v1, v2] = voters
    await ballot.giveRightToVote(v1.address);
    await expect(
      ballot.giveRightToVote(v1.address)
    ).to.be.reverted
    await ballot.connect(v1).vote(1)
   
    expect(await ballot.winningProposalName()).to.equal(formatBytes32String("orange"))
    await expect(
      ballot.connect(v2).vote(1)
    ).to.be.revertedWith("has no right to vote")

    await expect(
      ballot.connect(v1).vote(0)
    ).to.be.revertedWith('has already voted')
  })


  it("delegation", async function () {
    const {ballot, Ballot, voters} = await loadFixture(getFixture)
    
    const [v1, v2, v3, v4] = voters

    await ballot.giveRightToVote(v1.address)
    await ballot.giveRightToVote(v2.address)
    await ballot.giveRightToVote(v3.address)

    await expect(
      ballot.connect(v4).delegate(v3.address)
    ).to.be.revertedWith('you have no right to vote')
    await ballot.giveRightToVote(v4.address)
    expect(
      await (await ballot.voters(v3.address)).weight
    ).to.be.equal(1)
    await ballot.connect(v4).delegate(v3.address)

    await ballot.connect(v3).delegate(v2.address)
    
    await expect(
      ballot.connect(v2).delegate(v2.address)

    ).to.be.reverted

    await expect(
      ballot.connect(v2).delegate(v4.address)
    ).to.be.revertedWith('found loop in delegation')
    
    await expect(
      ballot.connect(v2).vote(0)

    ).not.to.be.reverted

     expect(
      await ballot.winningProposal()
    ).to.be.equal(0)

    expect(
      (await ballot.proposals(0)).voteCount
    ).to.be.equal(3)

    await expect(
      ballot.connect(v2).vote(0)
    ).to.be.reverted
  })

})

