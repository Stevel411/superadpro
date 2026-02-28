// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title IERC20 - Minimal ERC20 interface for USDC
 */
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/**
 * @title SuperAdPro - Decentralised Income Platform
 * @notice Base Chain | USDC | 8x8 Grid | Uni-Level | Course Pass-Up
 * @dev Upgradeable via OpenZeppelin TransparentProxy
 *
 * PAYMENT FLOWS:
 *   Membership: $20 USDC/month → $10 sponsor + $10 company treasury
 *   Grid Tiers: $20-$1000 → 25% sponsor + 70% uni-level (8.75% x 8) + 5% platform
 *   Courses:    $100/$300/$500 → 100% to affiliate (1st sale at tier passes up)
 *
 * BASE CHAIN USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 */
contract SuperAdPro is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    // ═══════════════════════════════════════════════════════════
    //  CONSTANTS
    // ═══════════════════════════════════════════════════════════

    uint256 public constant USDC_DECIMALS = 6;
    uint256 public constant MEMBERSHIP_FEE = 20 * 10**USDC_DECIMALS;       // $20
    uint256 public constant MEMBERSHIP_SPONSOR_SHARE = 10 * 10**USDC_DECIMALS; // $10
    uint256 public constant MEMBERSHIP_COMPANY_SHARE = 10 * 10**USDC_DECIMALS; // $10

    // Grid commission splits (basis points, 10000 = 100%)
    uint256 public constant DIRECT_SPONSOR_BPS = 2500;   // 25%
    uint256 public constant UNILEVEL_TOTAL_BPS = 7000;    // 70% (8.75% x 8 levels)
    uint256 public constant PER_LEVEL_BPS      = 875;     // 8.75% per level
    uint256 public constant PLATFORM_FEE_BPS   = 500;     // 5%
    uint256 public constant BPS_DENOMINATOR    = 10000;

    uint8 public constant GRID_WIDTH  = 8;   // positions per level
    uint8 public constant GRID_LEVELS = 8;   // levels deep
    uint8 public constant GRID_TOTAL  = 63;  // total seats (8x8 - 1 owner)

    uint8 public constant MAX_TIERS = 8;
    uint8 public constant MAX_COURSE_TIERS = 3;
    uint16 public constant MAX_UPLINE_DEPTH = 500;  // course pass-up chain limit

    // ═══════════════════════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════════════════════

    IERC20 public usdc;
    address public treasury;  // company wallet

    // ── Member data ──
    struct Member {
        address sponsor;
        bool isActive;
        bool exists;
        uint64 memberSince;
        uint64 lastRenewal;
        uint32 personalReferrals;
        uint32 totalTeam;
        uint256 totalEarned;         // lifetime on-chain earnings (USDC raw)
        uint256 gridEarnings;
        uint256 levelEarnings;
        uint256 courseEarnings;
    }

    mapping(address => Member) public members;
    address[] public memberList;  // for enumeration

    // ── Grid data ──
    struct Grid {
        address owner;
        uint8 tier;
        uint16 advance;           // which cycle (1, 2, 3...)
        uint8 positionsFilled;
        bool isComplete;
        uint256 revenueTotal;     // total USDC collected
    }

    uint256 public nextGridId;
    mapping(uint256 => Grid) public grids;
    mapping(uint256 => mapping(uint8 => mapping(uint8 => address))) public gridPositions;
    // gridPositions[gridId][level][position] = member address

    // Active grid per owner per tier
    mapping(address => mapping(uint8 => uint256)) public activeGridId;

    // Grid tier prices (USDC raw amounts)
    mapping(uint8 => uint256) public tierPrice;

    // ── Course data ──
    struct CourseInfo {
        uint256 price;       // USDC raw
        bool isActive;
    }

    mapping(uint8 => CourseInfo) public courses;  // tier 1, 2, 3

    // Course pass-up tracking: salesCount[user][courseTier]
    mapping(address => mapping(uint8 => uint16)) public courseSalesCount;
    mapping(address => mapping(uint8 => bool)) public courseFirstPassedUp;

    // Course ownership: has this user purchased this tier?
    mapping(address => mapping(uint8 => bool)) public courseOwned;

    // ═══════════════════════════════════════════════════════════
    //  EVENTS (backend syncs to PostgreSQL via these)
    // ═══════════════════════════════════════════════════════════

    event MemberRegistered(
        address indexed member,
        address indexed sponsor,
        uint256 amount,
        uint256 timestamp
    );

    event MembershipRenewed(
        address indexed member,
        address indexed sponsor,
        uint256 sponsorShare,
        uint256 companyShare,
        uint256 timestamp
    );

    event MemberDeactivated(
        address indexed member,
        uint256 timestamp
    );

    event GridPurchase(
        address indexed member,
        uint8 tier,
        uint256 price,
        uint256 gridId,
        uint8 gridLevel,
        uint8 positionNum
    );

    event GridCompleted(
        address indexed owner,
        uint8 tier,
        uint16 advance,
        uint256 gridId,
        uint256 newGridId
    );

    event CommissionPaid(
        address indexed from,
        address indexed to,
        uint256 amount,
        string commissionType,
        uint8 tier
    );

    event PlatformFeePaid(
        address indexed from,
        uint256 amount,
        string feeType,
        uint8 tier
    );

    event CoursePurchased(
        address indexed buyer,
        uint8 tier,
        uint256 price
    );

    event CourseCommissionPaid(
        address indexed buyer,
        address indexed earner,
        uint256 amount,
        uint8 courseTier,
        bool isPassUp,
        uint16 passUpDepth
    );

    event CascadeActivation(
        address indexed member,
        uint16 depth,
        uint256 timestamp
    );

    // ═══════════════════════════════════════════════════════════
    //  INITIALISER (replaces constructor for upgradeable)
    // ═══════════════════════════════════════════════════════════

    function initialize(
        address _usdc,
        address _treasury
    ) external initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __Pausable_init();

        usdc = IERC20(_usdc);
        treasury = _treasury;

        // Set grid tier prices
        tierPrice[1] = 20 * 10**USDC_DECIMALS;
        tierPrice[2] = 50 * 10**USDC_DECIMALS;
        tierPrice[3] = 100 * 10**USDC_DECIMALS;
        tierPrice[4] = 200 * 10**USDC_DECIMALS;
        tierPrice[5] = 400 * 10**USDC_DECIMALS;
        tierPrice[6] = 600 * 10**USDC_DECIMALS;
        tierPrice[7] = 800 * 10**USDC_DECIMALS;
        tierPrice[8] = 1000 * 10**USDC_DECIMALS;

        // Set course prices
        courses[1] = CourseInfo(100 * 10**USDC_DECIMALS, true);
        courses[2] = CourseInfo(300 * 10**USDC_DECIMALS, true);
        courses[3] = CourseInfo(500 * 10**USDC_DECIMALS, true);

        nextGridId = 1;
    }

    // ═══════════════════════════════════════════════════════════
    //  MEMBERSHIP: REGISTER & RENEW
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Register as a new member. Pays $20 USDC ($10 sponsor, $10 company).
     * @param _sponsor Address of the person who referred you (address(0) if none)
     */
    function register(address _sponsor) external nonReentrant whenNotPaused {
        require(!members[msg.sender].exists, "Already registered");
        require(_sponsor != msg.sender, "Cannot sponsor yourself");

        // If sponsor specified, they must exist
        if (_sponsor != address(0)) {
            require(members[_sponsor].exists, "Sponsor not registered");
        }

        // Transfer USDC from member
        require(
            usdc.transferFrom(msg.sender, address(this), MEMBERSHIP_FEE),
            "USDC transfer failed"
        );

        // Split: $10 to sponsor, $10 to treasury
        if (_sponsor != address(0)) {
            require(usdc.transfer(_sponsor, MEMBERSHIP_SPONSOR_SHARE), "Sponsor transfer failed");
            require(usdc.transfer(treasury, MEMBERSHIP_COMPANY_SHARE), "Treasury transfer failed");

            // Update sponsor stats
            members[_sponsor].personalReferrals++;
            members[_sponsor].totalEarned += MEMBERSHIP_SPONSOR_SHARE;

            emit CommissionPaid(msg.sender, _sponsor, MEMBERSHIP_SPONSOR_SHARE, "membership_sponsor", 0);
        } else {
            // No sponsor — full amount to treasury
            require(usdc.transfer(treasury, MEMBERSHIP_FEE), "Treasury transfer failed");
        }

        emit PlatformFeePaid(msg.sender, _sponsor != address(0) ? MEMBERSHIP_COMPANY_SHARE : MEMBERSHIP_FEE, "membership_company", 0);

        // Create member record
        members[msg.sender] = Member({
            sponsor: _sponsor,
            isActive: true,
            exists: true,
            memberSince: uint64(block.timestamp),
            lastRenewal: uint64(block.timestamp),
            personalReferrals: 0,
            totalTeam: 0,
            totalEarned: 0,
            gridEarnings: 0,
            levelEarnings: 0,
            courseEarnings: 0
        });
        memberList.push(msg.sender);

        emit MemberRegistered(msg.sender, _sponsor, MEMBERSHIP_FEE, block.timestamp);
    }

    /**
     * @notice Renew membership for another month. Same 50/50 split.
     */
    function renewMembership() external nonReentrant whenNotPaused {
        Member storage m = members[msg.sender];
        require(m.exists, "Not registered");

        require(
            usdc.transferFrom(msg.sender, address(this), MEMBERSHIP_FEE),
            "USDC transfer failed"
        );

        // Split
        if (m.sponsor != address(0) && members[m.sponsor].exists) {
            require(usdc.transfer(m.sponsor, MEMBERSHIP_SPONSOR_SHARE), "Sponsor transfer failed");
            require(usdc.transfer(treasury, MEMBERSHIP_COMPANY_SHARE), "Treasury transfer failed");

            members[m.sponsor].totalEarned += MEMBERSHIP_SPONSOR_SHARE;

            emit CommissionPaid(msg.sender, m.sponsor, MEMBERSHIP_SPONSOR_SHARE, "membership_renewal", 0);
        } else {
            require(usdc.transfer(treasury, MEMBERSHIP_FEE), "Treasury transfer failed");
        }

        emit PlatformFeePaid(msg.sender, m.sponsor != address(0) ? MEMBERSHIP_COMPANY_SHARE : MEMBERSHIP_FEE, "membership_renewal_company", 0);

        m.isActive = true;
        m.lastRenewal = uint64(block.timestamp);

        emit MembershipRenewed(
            msg.sender,
            m.sponsor,
            m.sponsor != address(0) ? MEMBERSHIP_SPONSOR_SHARE : 0,
            m.sponsor != address(0) ? MEMBERSHIP_COMPANY_SHARE : MEMBERSHIP_FEE,
            block.timestamp
        );
    }

    /**
     * @notice Admin can deactivate a member (e.g. grace period expired).
     */
    function deactivateMember(address _member) external onlyOwner {
        require(members[_member].exists, "Member not found");
        members[_member].isActive = false;
        emit MemberDeactivated(_member, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════
    //  GRID: PURCHASE TIER POSITION
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Purchase a grid tier position. Commissions distribute instantly.
     * @param _tier Grid tier (1-8)
     *
     * Commission split:
     *   25% → direct sponsor
     *   70% → 8.75% x 8 levels up the uni-level chain
     *    5% → platform treasury
     *
     * If uni-level chain is shorter than 8, unclaimed levels go to treasury.
     */
    function purchaseGridTier(uint8 _tier) external nonReentrant whenNotPaused {
        require(_tier >= 1 && _tier <= MAX_TIERS, "Invalid tier");
        Member storage m = members[msg.sender];
        require(m.exists && m.isActive, "Not an active member");

        uint256 price = tierPrice[_tier];
        require(price > 0, "Tier not configured");

        // Transfer USDC from buyer to contract
        require(
            usdc.transferFrom(msg.sender, address(this), price),
            "USDC transfer failed"
        );

        // 1. Pay direct sponsor (25%)
        uint256 sponsorAmount = (price * DIRECT_SPONSOR_BPS) / BPS_DENOMINATOR;
        _payDirectSponsor(msg.sender, sponsorAmount, _tier);

        // 2. Pay uni-level chain (8.75% x 8 levels = 70%)
        uint256 perLevelAmount = (price * PER_LEVEL_BPS) / BPS_DENOMINATOR;
        _payUniLevelChain(msg.sender, perLevelAmount, _tier);

        // 3. Platform fee (5%)
        uint256 platformAmount = (price * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        require(usdc.transfer(treasury, platformAmount), "Platform fee transfer failed");
        emit PlatformFeePaid(msg.sender, platformAmount, "grid_platform_fee", _tier);

        // 4. Place in sponsor's grid
        (uint256 gridId, uint8 level, uint8 pos) = _placeInGrid(msg.sender, _tier);

        emit GridPurchase(msg.sender, _tier, price, gridId, level, pos);

        // 5. Check grid completion
        Grid storage g = grids[gridId];
        g.revenueTotal += price;
        if (g.positionsFilled >= GRID_TOTAL) {
            _completeGrid(gridId);
        }
    }

    /**
     * @dev Pay 25% to the buyer's direct sponsor
     */
    function _payDirectSponsor(
        address _buyer,
        uint256 _amount,
        uint8 _tier
    ) internal {
        address sponsor = members[_buyer].sponsor;

        if (sponsor != address(0) && members[sponsor].exists) {
            require(usdc.transfer(sponsor, _amount), "Sponsor payout failed");
            members[sponsor].totalEarned += _amount;
            members[sponsor].gridEarnings += _amount;
            emit CommissionPaid(_buyer, sponsor, _amount, "direct_sponsor", _tier);
        } else {
            // No sponsor — platform absorbs
            require(usdc.transfer(treasury, _amount), "Treasury absorb failed");
            emit PlatformFeePaid(_buyer, _amount, "no_sponsor_absorb", _tier);
        }
    }

    /**
     * @dev Pay 8.75% to each of 8 levels up the sponsor chain
     */
    function _payUniLevelChain(
        address _buyer,
        uint256 _perLevel,
        uint8 _tier
    ) internal {
        address current = _buyer;

        for (uint8 lvl = 1; lvl <= GRID_LEVELS; lvl++) {
            address upline = members[current].sponsor;

            if (upline == address(0) || !members[upline].exists) {
                // Chain ended — remaining levels go to treasury
                uint256 remaining = _perLevel * (GRID_LEVELS - lvl + 1);
                require(usdc.transfer(treasury, remaining), "Treasury absorb failed");
                emit PlatformFeePaid(_buyer, remaining, "short_chain_absorb", _tier);
                break;
            }

            require(usdc.transfer(upline, _perLevel), "Uni-level payout failed");
            members[upline].totalEarned += _perLevel;
            members[upline].levelEarnings += _perLevel;
            emit CommissionPaid(_buyer, upline, _perLevel, "uni_level", _tier);

            current = upline;
        }
    }

    /**
     * @dev Place buyer into their sponsor's active grid for this tier.
     *      If sponsor's grid is full, walk up the upline for spillover.
     */
    function _placeInGrid(
        address _buyer,
        uint8 _tier
    ) internal returns (uint256 gridId, uint8 level, uint8 position) {
        address sponsor = members[_buyer].sponsor;
        if (sponsor == address(0)) sponsor = owner();  // fallback to admin

        // Try sponsor's grid first, then walk upline for spillover
        address current = sponsor;
        uint16 depth = 0;

        while (depth < 100) {  // safety cap on spillover search
            gridId = activeGridId[current][_tier];

            // Create grid if none exists
            if (gridId == 0) {
                gridId = _createGrid(current, _tier);
            }

            Grid storage g = grids[gridId];

            if (g.positionsFilled < GRID_TOTAL) {
                // Found space — place here
                (level, position) = _nextSlot(gridId);
                gridPositions[gridId][level][position] = _buyer;
                g.positionsFilled++;

                // Update grid owner's team count
                members[current].totalTeam++;

                return (gridId, level, position);
            }

            // Grid full — move up
            current = members[current].sponsor;
            if (current == address(0)) current = owner();
            depth++;
        }

        revert("No available grid in upline");
    }

    /**
     * @dev Find next empty slot in a grid (level 1-8, position 1-8)
     */
    function _nextSlot(uint256 _gridId) internal view returns (uint8 level, uint8 position) {
        for (uint8 lvl = 1; lvl <= GRID_LEVELS; lvl++) {
            for (uint8 pos = 1; pos <= GRID_WIDTH; pos++) {
                if (gridPositions[_gridId][lvl][pos] == address(0)) {
                    return (lvl, pos);
                }
            }
        }
        revert("Grid is full");
    }

    /**
     * @dev Create a new grid for an owner at a tier
     */
    function _createGrid(address _owner, uint8 _tier) internal returns (uint256 gridId) {
        gridId = nextGridId++;
        uint16 advance = 1;

        // Check if there's a completed grid to get advance number
        uint256 prevId = activeGridId[_owner][_tier];
        if (prevId != 0 && grids[prevId].isComplete) {
            advance = grids[prevId].advance + 1;
        }

        grids[gridId] = Grid({
            owner: _owner,
            tier: _tier,
            advance: advance,
            positionsFilled: 0,
            isComplete: false,
            revenueTotal: 0
        });

        activeGridId[_owner][_tier] = gridId;
        return gridId;
    }

    /**
     * @dev Mark grid complete and auto-create next advance
     */
    function _completeGrid(uint256 _gridId) internal {
        Grid storage g = grids[_gridId];
        g.isComplete = true;

        // Create next advance
        uint256 newId = nextGridId++;
        grids[newId] = Grid({
            owner: g.owner,
            tier: g.tier,
            advance: g.advance + 1,
            positionsFilled: 0,
            isComplete: false,
            revenueTotal: 0
        });
        activeGridId[g.owner][g.tier] = newId;

        emit GridCompleted(g.owner, g.tier, g.advance, _gridId, newId);
    }

    // ═══════════════════════════════════════════════════════════
    //  COURSES: PURCHASE + INFINITE PASS-UP
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Purchase a course. 100% commission to affiliate.
     *         First sale at each tier passes up to qualified sponsor.
     * @param _tier Course tier (1, 2, or 3)
     * @param _affiliate Address of the person who sold this course
     */
    function purchaseCourse(
        uint8 _tier,
        address _affiliate
    ) external nonReentrant whenNotPaused {
        require(_tier >= 1 && _tier <= MAX_COURSE_TIERS, "Invalid course tier");
        require(courses[_tier].isActive, "Course not active");
        require(members[msg.sender].exists, "Not registered");
        require(_affiliate != msg.sender, "Cannot buy from yourself");
        require(members[_affiliate].exists, "Affiliate not registered");

        uint256 price = courses[_tier].price;

        // Transfer USDC from buyer to contract
        require(
            usdc.transferFrom(msg.sender, address(this), price),
            "USDC transfer failed"
        );

        // Record ownership
        courseOwned[msg.sender][_tier] = true;

        emit CoursePurchased(msg.sender, _tier, price);

        // Determine commission recipient via pass-up logic
        (address earner, bool isPassUp, uint16 depth) = _resolveCoursePayout(
            _affiliate, _tier
        );

        // Pay the earner 100%
        if (earner != address(0)) {
            require(usdc.transfer(earner, price), "Course payout failed");
            members[earner].totalEarned += price;
            members[earner].courseEarnings += price;

            emit CourseCommissionPaid(msg.sender, earner, price, _tier, isPassUp, depth);
        } else {
            // Nobody qualified — treasury gets it
            require(usdc.transfer(treasury, price), "Treasury course fallback failed");
            emit PlatformFeePaid(msg.sender, price, "course_no_qualified", _tier);
        }

        // Update affiliate's sales count for this tier
        courseSalesCount[_affiliate][_tier]++;
    }

    /**
     * @dev Resolve who earns the course commission.
     *      If affiliate's first sale at this tier → pass up to qualified sponsor.
     *      Otherwise → affiliate keeps it.
     *
     * "Qualified" = has purchased that course tier themselves.
     */
    function _resolveCoursePayout(
        address _affiliate,
        uint8 _tier
    ) internal returns (address earner, bool isPassUp, uint16 depth) {
        // Check if this is the affiliate's first sale at this tier
        if (!courseFirstPassedUp[_affiliate][_tier]) {
            // First sale — must pass up
            courseFirstPassedUp[_affiliate][_tier] = true;

            // Walk upline to find qualified sponsor
            address current = _affiliate;
            for (uint16 d = 1; d <= MAX_UPLINE_DEPTH; d++) {
                address upline = members[current].sponsor;
                if (upline == address(0)) break;

                // Qualified = owns this tier or higher
                if (_isQualifiedForTier(upline, _tier)) {
                    return (upline, true, d);
                }
                current = upline;
            }

            // Nobody qualified — treasury
            return (address(0), true, 0);
        }

        // Not first sale — affiliate keeps 100%
        return (_affiliate, false, 0);
    }

    /**
     * @dev Check if a user is qualified for a course tier (owns it or higher)
     */
    function _isQualifiedForTier(address _user, uint8 _tier) internal view returns (bool) {
        for (uint8 t = _tier; t <= MAX_COURSE_TIERS; t++) {
            if (courseOwned[_user][t]) return true;
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS (for frontend + backend sync)
    // ═══════════════════════════════════════════════════════════

    function getMember(address _addr) external view returns (
        address sponsor,
        bool isActive,
        bool exists,
        uint64 memberSince,
        uint64 lastRenewal,
        uint32 personalReferrals,
        uint32 totalTeam,
        uint256 totalEarned,
        uint256 gridEarnings,
        uint256 levelEarnings,
        uint256 courseEarnings
    ) {
        Member storage m = members[_addr];
        return (
            m.sponsor, m.isActive, m.exists,
            m.memberSince, m.lastRenewal,
            m.personalReferrals, m.totalTeam,
            m.totalEarned, m.gridEarnings,
            m.levelEarnings, m.courseEarnings
        );
    }

    function getGrid(uint256 _gridId) external view returns (
        address owner_,
        uint8 tier,
        uint16 advance,
        uint8 positionsFilled,
        bool isComplete,
        uint256 revenueTotal
    ) {
        Grid storage g = grids[_gridId];
        return (g.owner, g.tier, g.advance, g.positionsFilled, g.isComplete, g.revenueTotal);
    }

    function getGridPosition(
        uint256 _gridId, uint8 _level, uint8 _position
    ) external view returns (address) {
        return gridPositions[_gridId][_level][_position];
    }

    function getActiveGridId(address _owner, uint8 _tier) external view returns (uint256) {
        return activeGridId[_owner][_tier];
    }

    function getMemberCount() external view returns (uint256) {
        return memberList.length;
    }

    function getCourseSalesCount(address _user, uint8 _tier) external view returns (uint16) {
        return courseSalesCount[_user][_tier];
    }

    function isCoursePassedUp(address _user, uint8 _tier) external view returns (bool) {
        return courseFirstPassedUp[_user][_tier];
    }

    // ═══════════════════════════════════════════════════════════
    //  ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @notice Register the admin/company as the root member (no sponsor, no fee)
     */
    function registerAdmin() external onlyOwner {
        require(!members[msg.sender].exists, "Already registered");
        members[msg.sender] = Member({
            sponsor: address(0),
            isActive: true,
            exists: true,
            memberSince: uint64(block.timestamp),
            lastRenewal: uint64(block.timestamp),
            personalReferrals: 0,
            totalTeam: 0,
            totalEarned: 0,
            gridEarnings: 0,
            levelEarnings: 0,
            courseEarnings: 0
        });
        memberList.push(msg.sender);
        emit MemberRegistered(msg.sender, address(0), 0, block.timestamp);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    function setCoursePrice(uint8 _tier, uint256 _price) external onlyOwner {
        require(_tier >= 1 && _tier <= MAX_COURSE_TIERS, "Invalid tier");
        courses[_tier].price = _price;
    }

    function setCourseActive(uint8 _tier, bool _active) external onlyOwner {
        require(_tier >= 1 && _tier <= MAX_COURSE_TIERS, "Invalid tier");
        courses[_tier].isActive = _active;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice Emergency: recover any ERC20 tokens accidentally sent to contract
     */
    function recoverTokens(address _token, uint256 _amount) external onlyOwner {
        require(IERC20(_token).transfer(treasury, _amount), "Recovery failed");
    }
}
