// SuperAdPro Deployment Script
// Deploys upgradeable proxy on Base Chain
//
// Usage:
//   DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.js --network baseSepolia
//   DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy.js --network base

const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // ── Network-specific USDC addresses ──
  const network = await ethers.provider.getNetwork();
  let usdcAddress;

  if (network.chainId === 8453n) {
    // Base Mainnet
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("🟢 Deploying to BASE MAINNET");
  } else if (network.chainId === 84532n) {
    // Base Sepolia Testnet
    usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Circle test USDC
    console.log("🟡 Deploying to BASE SEPOLIA TESTNET");
  } else {
    console.log("⚪ Deploying to LOCAL HARDHAT");
    // Deploy a mock USDC for local testing
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    console.log("Mock USDC deployed at:", usdcAddress);
  }

  // ── Deploy SuperAdPro (upgradeable proxy) ──
  const SuperAdPro = await ethers.getContractFactory("SuperAdPro");

  console.log("\nDeploying SuperAdPro proxy...");
  const proxy = await upgrades.deployProxy(
    SuperAdPro,
    [usdcAddress, deployer.address],  // treasury = deployer initially
    { initializer: "initialize" }
  );
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\n════════════════════════════════════════");
  console.log("  SuperAdPro DEPLOYED");
  console.log("════════════════════════════════════════");
  console.log("  Proxy:          ", proxyAddress);
  console.log("  Implementation: ", implAddress);
  console.log("  USDC:           ", usdcAddress);
  console.log("  Treasury:       ", deployer.address);
  console.log("  Network:        ", network.chainId.toString());
  console.log("════════════════════════════════════════");

  // Register admin as root member
  console.log("\nRegistering admin as root member...");
  const tx = await proxy.registerAdmin();
  await tx.wait();
  console.log("✅ Admin registered");

  // Save deployment info
  const fs = require("fs");
  const deployInfo = {
    network: network.chainId.toString(),
    proxy: proxyAddress,
    implementation: implAddress,
    usdc: usdcAddress,
    treasury: deployer.address,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
  };
  fs.writeFileSync(
    `deployments/${network.chainId}.json`,
    JSON.stringify(deployInfo, null, 2)
  );
  console.log(`\n📄 Deployment info saved to deployments/${network.chainId}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
