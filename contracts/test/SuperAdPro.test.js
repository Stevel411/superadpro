const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("SuperAdPro", function () {
  let superAdPro, usdt;
  let owner, treasury, alice, bob, charlie, dave, eve;
  const USDT = (n) => ethers.parseUnits(n.toString(), 6);

  beforeEach(async function () {
    [owner, treasury, alice, bob, charlie, dave, eve] = await ethers.getSigners();

    // Deploy mock USDT
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    usdt = await MockUSDT.deploy();

    // Deploy SuperAdPro via proxy
    const SuperAdPro = await ethers.getContractFactory("SuperAdPro");
    superAdPro = await upgrades.deployProxy(
      SuperAdPro,
      [await usdt.getAddress(), treasury.address],
      { initializer: "initialize" }
    );

    // Register owner as root admin
    await superAdPro.registerAdmin();

    // Distribute test USDT to all users
    for (const user of [alice, bob, charlie, dave, eve]) {
      await usdt.mint(user.address, USDT(100000));
      await usdt.connect(user).approve(await superAdPro.getAddress(), USDT(100000));
    }
  });

  // ═══════════════════════════════════════════
  //  MEMBERSHIP TESTS
  // ═══════════════════════════════════════════

  describe("Membership Registration", function () {
    it("should register a new member with 50/50 split", async function () {
      const treasuryBefore = await usdt.balanceOf(treasury.address);
      const ownerBefore = await usdt.balanceOf(owner.address);

      await superAdPro.connect(alice).register(owner.address);

      const treasuryAfter = await usdt.balanceOf(treasury.address);
      const ownerAfter = await usdt.balanceOf(owner.address);

      // Treasury gets $10
      expect(treasuryAfter - treasuryBefore).to.equal(USDT(10));
      // Sponsor (owner) gets $10
      expect(ownerAfter - ownerBefore).to.equal(USDT(10));

      // Alice is now active
      const member = await superAdPro.getMember(alice.address);
      expect(member.isActive).to.be.true;
      expect(member.exists).to.be.true;
      expect(member.sponsor).to.equal(owner.address);
    });

    it("should register without sponsor (100% to treasury)", async function () {
      const treasuryBefore = await usdt.balanceOf(treasury.address);

      await superAdPro.connect(alice).register(ethers.ZeroAddress);

      const treasuryAfter = await usdt.balanceOf(treasury.address);
      expect(treasuryAfter - treasuryBefore).to.equal(USDT(20));
    });

    it("should reject duplicate registration", async function () {
      await superAdPro.connect(alice).register(owner.address);
      await expect(
        superAdPro.connect(alice).register(owner.address)
      ).to.be.revertedWith("Already registered");
    });

    it("should reject self-sponsorship", async function () {
      await expect(
        superAdPro.connect(alice).register(alice.address)
      ).to.be.revertedWith("Cannot sponsor yourself");
    });

    it("should reject non-existent sponsor", async function () {
      await expect(
        superAdPro.connect(alice).register(bob.address)
      ).to.be.revertedWith("Sponsor not registered");
    });

    it("should update sponsor stats", async function () {
      await superAdPro.connect(alice).register(owner.address);
      const member = await superAdPro.getMember(owner.address);
      expect(member.personalReferrals).to.equal(1);
      expect(member.totalEarned).to.equal(USDT(10));
    });

    it("should emit MemberRegistered event", async function () {
      await expect(superAdPro.connect(alice).register(owner.address))
        .to.emit(superAdPro, "MemberRegistered")
        .withArgs(alice.address, owner.address, USDT(20), (v) => v > 0);
    });
  });

  describe("Membership Renewal", function () {
    beforeEach(async function () {
      await superAdPro.connect(alice).register(owner.address);
    });

    it("should renew with 50/50 split", async function () {
      const ownerBefore = await usdt.balanceOf(owner.address);
      const treasuryBefore = await usdt.balanceOf(treasury.address);

      await superAdPro.connect(alice).renewMembership();

      expect((await usdt.balanceOf(owner.address)) - ownerBefore).to.equal(USDT(10));
      expect((await usdt.balanceOf(treasury.address)) - treasuryBefore).to.equal(USDT(10));
    });

    it("should emit MembershipRenewed event", async function () {
      await expect(superAdPro.connect(alice).renewMembership())
        .to.emit(superAdPro, "MembershipRenewed");
    });
  });

  // ═══════════════════════════════════════════
  //  GRID TIER TESTS
  // ═══════════════════════════════════════════

  describe("Grid Tier Purchase", function () {
    beforeEach(async function () {
      // Build a chain: owner → alice → bob → charlie
      await superAdPro.connect(alice).register(owner.address);
      await superAdPro.connect(bob).register(alice.address);
      await superAdPro.connect(charlie).register(bob.address);
    });

    it("should split Tier 1 ($20) correctly: 25/70/5", async function () {
      const aliceBefore = await usdt.balanceOf(alice.address);  // direct sponsor
      const ownerBefore = await usdt.balanceOf(owner.address);  // uni-level 2
      const treasuryBefore = await usdt.balanceOf(treasury.address);

      // Charlie buys Tier 1 ($20). Sponsor chain: bob → alice → owner
      await superAdPro.connect(charlie).purchaseGridTier(1);

      // Direct sponsor (bob) gets 25% = $5
      const bobAfter = await usdt.balanceOf(bob.address);
      // Bob started with 100000 - 20 (membership) = 99980
      // Now gets $5 sponsor commission

      // Alice (uni-level 1) gets 8.75% = $1.75
      const aliceAfter = await usdt.balanceOf(alice.address);

      // Owner (uni-level 2) gets 8.75% = $1.75
      const ownerAfter = await usdt.balanceOf(owner.address);

      // Treasury gets 5% platform + remaining 6 uni-levels absorbed
      // Platform: $1 + (6 x $1.75) = $1 + $10.50 = $11.50
      const treasuryAfter = await usdt.balanceOf(treasury.address);

      // Verify direct sponsor commission
      expect(aliceAfter - aliceBefore).to.equal(USDT(1.75)); // uni-level 1

      // Treasury should get platform fee + absorbed levels
      expect(treasuryAfter - treasuryBefore).to.equal(USDT(11.5)); // $1 + 6*$1.75
    });

    it("should emit GridPurchase event", async function () {
      await expect(superAdPro.connect(charlie).purchaseGridTier(1))
        .to.emit(superAdPro, "GridPurchase");
    });

    it("should reject inactive member", async function () {
      await superAdPro.deactivateMember(charlie.address);
      await expect(
        superAdPro.connect(charlie).purchaseGridTier(1)
      ).to.be.revertedWith("Not an active member");
    });

    it("should reject invalid tier", async function () {
      await expect(
        superAdPro.connect(charlie).purchaseGridTier(0)
      ).to.be.revertedWith("Invalid tier");
      await expect(
        superAdPro.connect(charlie).purchaseGridTier(9)
      ).to.be.revertedWith("Invalid tier");
    });

    it("should handle Tier 8 ($1000) correctly", async function () {
      // Give charlie more USDT
      await usdt.mint(charlie.address, USDT(10000));
      await usdt.connect(charlie).approve(await superAdPro.getAddress(), USDT(10000));

      const bobBefore = await usdt.balanceOf(bob.address);

      await superAdPro.connect(charlie).purchaseGridTier(8);

      // Bob (direct sponsor) gets 25% of $1000 = $250
      const bobAfter = await usdt.balanceOf(bob.address);
      expect(bobAfter - bobBefore).to.equal(USDT(250));
    });
  });

  // ═══════════════════════════════════════════
  //  COURSE TESTS
  // ═══════════════════════════════════════════

  describe("Course Purchase & Pass-Up", function () {
    beforeEach(async function () {
      // Chain: owner → alice → bob
      await superAdPro.connect(alice).register(owner.address);
      await superAdPro.connect(bob).register(alice.address);

      // Give users more USDT for courses
      for (const user of [alice, bob, charlie]) {
        await usdt.mint(user.address, USDT(10000));
        await usdt.connect(user).approve(await superAdPro.getAddress(), USDT(10000));
      }

      // Register charlie under bob
      await superAdPro.connect(charlie).register(bob.address);
    });

    it("should give 100% to affiliate on non-first sale", async function () {
      // Alice buys Tier 1 course (makes her qualified)
      await superAdPro.connect(alice).purchaseCourse(1, owner.address);

      // Bob buys Tier 1 (Alice's first sale — passes up to qualified upline)
      // Alice's first sale at tier 1 passes up
      await superAdPro.connect(bob).purchaseCourse(1, alice.address);

      // Charlie buys Tier 1 from Alice (Alice's second sale — she keeps it)
      const aliceBefore = await usdt.balanceOf(alice.address);
      await superAdPro.connect(charlie).purchaseCourse(1, alice.address);
      const aliceAfter = await usdt.balanceOf(alice.address);

      // Alice keeps 100% = $100
      expect(aliceAfter - aliceBefore).to.equal(USDT(100));
    });

    it("should pass up first sale to qualified sponsor", async function () {
      // Owner buys tier 1 (qualifies owner)
      // Alice's first sale should pass up to owner
      await superAdPro.connect(alice).purchaseCourse(1, owner.address); // owner gets this

      // Now bob buys from alice — alice's first sale at tier 1
      const ownerBefore = await usdt.balanceOf(owner.address);
      await superAdPro.connect(bob).purchaseCourse(1, alice.address);
      const ownerAfter = await usdt.balanceOf(owner.address);

      // Owner gets $100 (pass-up from alice's first sale)
      expect(ownerAfter - ownerBefore).to.equal(USDT(100));
    });

    it("should emit CourseCommissionPaid event", async function () {
      await superAdPro.connect(alice).purchaseCourse(1, owner.address);

      await expect(superAdPro.connect(bob).purchaseCourse(1, alice.address))
        .to.emit(superAdPro, "CourseCommissionPaid");
    });
  });

  // ═══════════════════════════════════════════
  //  ADMIN TESTS
  // ═══════════════════════════════════════════

  describe("Admin Functions", function () {
    it("should pause and unpause", async function () {
      await superAdPro.pause();
      await expect(
        superAdPro.connect(alice).register(owner.address)
      ).to.be.reverted;

      await superAdPro.unpause();
      await superAdPro.connect(alice).register(owner.address);
    });

    it("should update treasury", async function () {
      await superAdPro.setTreasury(alice.address);
      expect(await superAdPro.treasury()).to.equal(alice.address);
    });

    it("should deactivate member", async function () {
      await superAdPro.connect(alice).register(owner.address);
      await superAdPro.deactivateMember(alice.address);
      const member = await superAdPro.getMember(alice.address);
      expect(member.isActive).to.be.false;
    });

    it("should recover tokens", async function () {
      // Send some USDT directly to contract
      await usdt.transfer(await superAdPro.getAddress(), USDT(100));
      const before = await usdt.balanceOf(treasury.address);
      await superAdPro.recoverTokens(await usdt.getAddress(), USDT(100));
      expect((await usdt.balanceOf(treasury.address)) - before).to.equal(USDT(100));
    });
  });

  // ═══════════════════════════════════════════
  //  VIEW FUNCTION TESTS
  // ═══════════════════════════════════════════

  describe("View Functions", function () {
    it("should return correct member count", async function () {
      expect(await superAdPro.getMemberCount()).to.equal(1); // admin
      await superAdPro.connect(alice).register(owner.address);
      expect(await superAdPro.getMemberCount()).to.equal(2);
    });

    it("should return grid tier prices", async function () {
      expect(await superAdPro.tierPrice(1)).to.equal(USDT(20));
      expect(await superAdPro.tierPrice(8)).to.equal(USDT(1000));
    });
  });
});
