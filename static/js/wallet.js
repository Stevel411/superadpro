/**
 * SuperAdPro — Web3 Wallet Integration
 * Base Chain | USDC | ethers.js v6
 *
 * Include this script on any page that needs wallet connectivity.
 * CDN: <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.4/ethers.umd.min.js"></script>
 *
 * Usage:
 *   await wallet.connect();
 *   await wallet.registerMember(sponsorAddress);
 *   await wallet.purchaseGridTier(3);
 *   await wallet.purchaseCourse(1, affiliateAddress);
 */

const SuperAdProWallet = (function () {
  "use strict";

  // ── Config ──
  const CONFIG = {
    // Base Mainnet
    mainnet: {
      chainId: "0x2105",        // 8453
      chainIdDecimal: 8453,
      chainName: "Base",
      rpcUrl: "https://mainnet.base.org",
      blockExplorer: "https://basescan.org",
      usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      contract: "",  // Set after deployment
    },
    // Base Sepolia Testnet
    testnet: {
      chainId: "0x14A34",       // 84532
      chainIdDecimal: 84532,
      chainName: "Base Sepolia",
      rpcUrl: "https://sepolia.base.org",
      blockExplorer: "https://sepolia.basescan.org",
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      contract: "",  // Set after testnet deployment
    },
  };

  // Switch this to 'mainnet' for production
  const NETWORK = "testnet";
  const NET = CONFIG[NETWORK];

  // ── Contract ABI (only the functions we call from frontend) ──
  const CONTRACT_ABI = [
    // Registration & membership
    "function register(address _sponsor) external",
    "function renewMembership() external",
    // Grid
    "function purchaseGridTier(uint8 _tier) external",
    // Courses
    "function purchaseCourse(uint8 _tier, address _affiliate) external",
    // View functions
    "function getMember(address _addr) external view returns (address sponsor, bool isActive, bool exists, uint64 memberSince, uint64 lastRenewal, uint32 personalReferrals, uint32 totalTeam, uint256 totalEarned, uint256 gridEarnings, uint256 levelEarnings, uint256 courseEarnings)",
    "function getActiveGridId(address _owner, uint8 _tier) external view returns (uint256)",
    "function getGrid(uint256 _gridId) external view returns (address owner_, uint8 tier, uint16 advance, uint8 positionsFilled, bool isComplete, uint256 revenueTotal)",
    "function getMemberCount() external view returns (uint256)",
    "function tierPrice(uint8) external view returns (uint256)",
    // Events
    "event MemberRegistered(address indexed member, address indexed sponsor, uint256 amount, uint256 timestamp)",
    "event MembershipRenewed(address indexed member, address indexed sponsor, uint256 sponsorShare, uint256 companyShare, uint256 timestamp)",
    "event GridPurchase(address indexed member, uint8 tier, uint256 price, uint256 gridId, uint8 gridLevel, uint8 positionNum)",
    "event CommissionPaid(address indexed from, address indexed to, uint256 amount, string commissionType, uint8 tier)",
    "event CoursePurchased(address indexed buyer, uint8 tier, uint256 price)",
    "event CourseCommissionPaid(address indexed buyer, address indexed earner, uint256 amount, uint8 courseTier, bool isPassUp, uint16 passUpDepth)",
  ];

  const ERC20_ABI = [
    "function balanceOf(address) external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function decimals() external view returns (uint8)",
  ];

  // ── State ──
  let provider = null;
  let signer = null;
  let contract = null;
  let usdcContract = null;
  let connectedAddress = null;
  let onConnect = null;
  let onDisconnect = null;
  let onTxStart = null;
  let onTxConfirmed = null;
  let onTxFailed = null;

  // ── Helper: format USDC (6 decimals) ──
  function formatUSDC(raw) {
    return parseFloat(ethers.formatUnits(raw, 6)).toFixed(2);
  }
  function parseUSDC(amount) {
    return ethers.parseUnits(amount.toString(), 6);
  }

  // ── Switch to Base network ──
  async function switchToBase() {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: NET.chainId }],
      });
    } catch (switchError) {
      // Chain not added — add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: NET.chainId,
            chainName: NET.chainName,
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: [NET.rpcUrl],
            blockExplorerUrls: [NET.blockExplorer],
          }],
        });
      } else {
        throw switchError;
      }
    }
  }

  // ── Core: Connect Wallet ──
  async function connect() {
    if (!window.ethereum) {
      throw new Error("No wallet detected. Please install MetaMask or Coinbase Wallet.");
    }

    // Request accounts
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No account selected");
    }

    // Switch to Base
    await switchToBase();

    // Set up ethers
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    connectedAddress = await signer.getAddress();

    // Set up contracts
    if (NET.contract) {
      contract = new ethers.Contract(NET.contract, CONTRACT_ABI, signer);
    }
    usdcContract = new ethers.Contract(NET.usdc, ERC20_ABI, signer);

    // Listen for account/chain changes
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", () => window.location.reload());

    if (onConnect) onConnect(connectedAddress);
    return connectedAddress;
  }

  function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
      disconnect();
    } else {
      connectedAddress = accounts[0];
      if (onConnect) onConnect(connectedAddress);
    }
  }

  function disconnect() {
    provider = null;
    signer = null;
    contract = null;
    usdcContract = null;
    connectedAddress = null;
    if (onDisconnect) onDisconnect();
  }

  // ── USDC Balance & Allowance ──
  async function getUSDCBalance(address) {
    const addr = address || connectedAddress;
    if (!usdcContract) throw new Error("Not connected");
    const raw = await usdcContract.balanceOf(addr);
    return { raw, formatted: formatUSDC(raw) };
  }

  async function getUSDCAllowance() {
    if (!usdcContract || !contract) throw new Error("Not connected");
    const raw = await usdcContract.allowance(connectedAddress, NET.contract);
    return { raw, formatted: formatUSDC(raw) };
  }

  async function approveUSDC(amount) {
    if (!usdcContract) throw new Error("Not connected");
    const rawAmount = parseUSDC(amount);
    if (onTxStart) onTxStart("Approving USDC...");
    const tx = await usdcContract.approve(NET.contract, rawAmount);
    const receipt = await tx.wait();
    if (onTxConfirmed) onTxConfirmed("USDC approved", receipt.hash);
    return receipt;
  }

  // Max approve so user only does it once
  async function approveMax() {
    if (!usdcContract) throw new Error("Not connected");
    if (onTxStart) onTxStart("Approving USDC (unlimited)...");
    const tx = await usdcContract.approve(NET.contract, ethers.MaxUint256);
    const receipt = await tx.wait();
    if (onTxConfirmed) onTxConfirmed("USDC approved (unlimited)", receipt.hash);
    return receipt;
  }

  // ── Auto-approve helper: check allowance, approve if needed ──
  async function ensureAllowance(amount) {
    const rawAmount = parseUSDC(amount);
    const { raw: currentAllowance } = await getUSDCAllowance();
    if (currentAllowance < rawAmount) {
      // Approve max so they don't have to do it again
      await approveMax();
    }
  }

  // ══════════════════════════════════════════════
  //  TRANSACTION WRAPPERS
  // ══════════════════════════════════════════════

  /**
   * Register as a new member ($20 USDC)
   * @param {string} sponsorAddress - Address of referrer (or ethers.ZeroAddress)
   */
  async function registerMember(sponsorAddress) {
    if (!contract) throw new Error("Not connected");
    await ensureAllowance(20);
    if (onTxStart) onTxStart("Registering membership...");
    try {
      const tx = await contract.register(sponsorAddress || ethers.ZeroAddress);
      const receipt = await tx.wait();
      if (onTxConfirmed) onTxConfirmed("Membership activated!", receipt.hash);
      return receipt;
    } catch (e) {
      if (onTxFailed) onTxFailed(e.reason || e.message);
      throw e;
    }
  }

  /**
   * Renew membership ($20 USDC)
   */
  async function renewMembership() {
    if (!contract) throw new Error("Not connected");
    await ensureAllowance(20);
    if (onTxStart) onTxStart("Renewing membership...");
    try {
      const tx = await contract.renewMembership();
      const receipt = await tx.wait();
      if (onTxConfirmed) onTxConfirmed("Membership renewed!", receipt.hash);
      return receipt;
    } catch (e) {
      if (onTxFailed) onTxFailed(e.reason || e.message);
      throw e;
    }
  }

  /**
   * Purchase a grid tier position
   * @param {number} tier - Tier 1-8
   */
  async function purchaseGridTier(tier) {
    if (!contract) throw new Error("Not connected");
    const prices = { 1:20, 2:50, 3:100, 4:200, 5:400, 6:600, 7:800, 8:1000 };
    const price = prices[tier];
    if (!price) throw new Error("Invalid tier");
    await ensureAllowance(price);
    if (onTxStart) onTxStart(`Purchasing Tier ${tier} ($${price})...`);
    try {
      const tx = await contract.purchaseGridTier(tier);
      const receipt = await tx.wait();
      if (onTxConfirmed) onTxConfirmed(`Tier ${tier} purchased!`, receipt.hash);
      return receipt;
    } catch (e) {
      if (onTxFailed) onTxFailed(e.reason || e.message);
      throw e;
    }
  }

  /**
   * Purchase a course
   * @param {number} tier - Course tier 1, 2, or 3
   * @param {string} affiliateAddress - Who sold the course
   */
  async function purchaseCourse(tier, affiliateAddress) {
    if (!contract) throw new Error("Not connected");
    const prices = { 1:100, 2:300, 3:500 };
    const price = prices[tier];
    if (!price) throw new Error("Invalid course tier");
    await ensureAllowance(price);
    if (onTxStart) onTxStart(`Purchasing Course Tier ${tier} ($${price})...`);
    try {
      const tx = await contract.purchaseCourse(tier, affiliateAddress);
      const receipt = await tx.wait();
      if (onTxConfirmed) onTxConfirmed(`Course Tier ${tier} purchased!`, receipt.hash);
      return receipt;
    } catch (e) {
      if (onTxFailed) onTxFailed(e.reason || e.message);
      throw e;
    }
  }

  // ── Read functions ──
  async function getMemberInfo(address) {
    if (!contract) throw new Error("Not connected");
    const m = await contract.getMember(address || connectedAddress);
    return {
      sponsor: m.sponsor,
      isActive: m.isActive,
      exists: m.exists,
      memberSince: Number(m.memberSince),
      lastRenewal: Number(m.lastRenewal),
      personalReferrals: Number(m.personalReferrals),
      totalTeam: Number(m.totalTeam),
      totalEarned: formatUSDC(m.totalEarned),
      gridEarnings: formatUSDC(m.gridEarnings),
      levelEarnings: formatUSDC(m.levelEarnings),
      courseEarnings: formatUSDC(m.courseEarnings),
    };
  }

  async function getMemberCount() {
    if (!contract) throw new Error("Not connected");
    return Number(await contract.getMemberCount());
  }

  // ══════════════════════════════════════════════
  //  PUBLIC API
  // ══════════════════════════════════════════════

  return {
    // Connection
    connect,
    disconnect,
    isConnected: () => !!connectedAddress,
    getAddress: () => connectedAddress,
    getShortAddress: () => connectedAddress
      ? `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
      : null,

    // USDC
    getUSDCBalance,
    approveUSDC,
    approveMax,

    // Transactions
    registerMember,
    renewMembership,
    purchaseGridTier,
    purchaseCourse,

    // Read
    getMemberInfo,
    getMemberCount,

    // Config
    network: NETWORK,
    config: NET,

    // Event callbacks
    on(event, callback) {
      switch (event) {
        case "connect":     onConnect = callback; break;
        case "disconnect":  onDisconnect = callback; break;
        case "txStart":     onTxStart = callback; break;
        case "txConfirmed": onTxConfirmed = callback; break;
        case "txFailed":    onTxFailed = callback; break;
      }
    },

    // Explorer link
    txLink: (hash) => `${NET.blockExplorer}/tx/${hash}`,
    addressLink: (addr) => `${NET.blockExplorer}/address/${addr}`,
  };
})();

// Export for use
if (typeof module !== "undefined") module.exports = SuperAdProWallet;
