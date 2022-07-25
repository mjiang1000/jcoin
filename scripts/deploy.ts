import { artifacts, ethers } from "hardhat";
import fs from "fs"
import path from "path"

const formatBytes32String = ethers.utils.formatBytes32String
const names = ["apple", "orange", "banana"]

async function deployBallots() {
  const Bollots = await ethers.getContractFactory("Ballot");

  const bollots = await Bollots.deploy(names.map(i => formatBytes32String(i)))
  await bollots.deployed();
  const contractsDir = path.join(__dirname, "..", "dapp", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ Token: bollots.address }, undefined, 2)
  );

  const TokenArtifact = artifacts.readArtifactSync("Ballot");

  fs.writeFileSync(
    path.join(contractsDir, "Ballot.json"),
    JSON.stringify(TokenArtifact, null, 2)
  );
}

async function main() {
  const currentTimestampInSeconds = Math.round(Date.now() / 1000);
  const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
  const unlockTime = currentTimestampInSeconds + ONE_YEAR_IN_SECS;

  const lockedAmount = ethers.utils.parseEther("1");

  const Lock = await ethers.getContractFactory("Lock");
  const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

  await lock.deployed();

  console.log("Lock with 1 ETH deployed to:", lock.address);

  await deployBallots()
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
