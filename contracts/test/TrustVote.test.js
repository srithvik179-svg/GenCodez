const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

/**
 * TrustVote Contract Tests
 *
 * Covers: election creation, candidate management,
 * voter registration, voting, double-vote prevention,
 * and result retrieval.
 *
 * Uses Hardhat time helpers to manipulate block timestamps
 * so candidates can be added before start, then time is
 * fast-forwarded for voting.
 */
describe("TrustVote", function () {
  let trustVote;
  let owner, voter1, voter2, nonVoter;

  const ONE_HOUR = 3600;
  const ONE_DAY = 86400;

  beforeEach(async function () {
    [owner, voter1, voter2, nonVoter] = await ethers.getSigners();

    const TrustVote = await ethers.getContractFactory("TrustVote");
    trustVote = await TrustVote.deploy();
    await trustVote.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      expect(await trustVote.owner()).to.equal(owner.address);
    });

    it("should start with zero elections", async function () {
      expect(await trustVote.electionCount()).to.equal(0);
    });
  });

  describe("Voter Registration", function () {
    it("should register a voter", async function () {
      await trustVote.registerVoter(voter1.address);
      expect(await trustVote.registeredVoters(voter1.address)).to.be.true;
    });

    it("should emit VoterRegistered event", async function () {
      await expect(trustVote.registerVoter(voter1.address))
        .to.emit(trustVote, "VoterRegistered")
        .withArgs(voter1.address);
    });

    it("should revert if voter already registered", async function () {
      await trustVote.registerVoter(voter1.address);
      await expect(trustVote.registerVoter(voter1.address))
        .to.be.revertedWith("Voter already registered");
    });

    it("should revert if non-owner tries to register a voter", async function () {
      await expect(trustVote.connect(voter1).registerVoter(voter2.address))
        .to.be.reverted;
    });
  });

  describe("Election Creation", function () {
    it("should create an election", async function () {
      const latest = await time.latest();
      const start = latest + ONE_HOUR;
      const end = start + ONE_DAY;

      await trustVote.createElection("Test Election", start, end);
      expect(await trustVote.electionCount()).to.equal(1);

      const election = await trustVote.elections(1);
      expect(election.name).to.equal("Test Election");
      expect(election.exists).to.be.true;
    });

    it("should emit ElectionCreated event", async function () {
      const latest = await time.latest();
      const start = latest + ONE_HOUR;
      const end = start + ONE_DAY;

      await expect(trustVote.createElection("Test Election", start, end))
        .to.emit(trustVote, "ElectionCreated");
    });

    it("should revert if end time is before start time", async function () {
      const latest = await time.latest();
      const start = latest + ONE_HOUR;
      await expect(trustVote.createElection("Bad Election", start, start - 1))
        .to.be.revertedWith("End time must be after start time");
    });

    it("should revert if non-owner creates election", async function () {
      const latest = await time.latest();
      const start = latest + ONE_HOUR;
      const end = start + ONE_DAY;
      await expect(trustVote.connect(voter1).createElection("Fail", start, end))
        .to.be.reverted;
    });
  });

  describe("Candidate Management", function () {
    beforeEach(async function () {
      const latest = await time.latest();
      const start = latest + ONE_HOUR;
      const end = start + ONE_DAY;
      await trustVote.createElection("Candidate Test", start, end);
    });

    it("should add a candidate", async function () {
      await trustVote.addCandidate(1, "Alice");
      const candidate = await trustVote.candidates(1, 1);
      expect(candidate.name).to.equal("Alice");
      expect(candidate.voteCount).to.equal(0);
    });

    it("should add multiple candidates", async function () {
      await trustVote.addCandidate(1, "Alice");
      await trustVote.addCandidate(1, "Bob");

      const election = await trustVote.elections(1);
      expect(election.candidateCount).to.equal(2);
    });

    it("should emit CandidateAdded event", async function () {
      await expect(trustVote.addCandidate(1, "Alice"))
        .to.emit(trustVote, "CandidateAdded")
        .withArgs(1, 1, "Alice");
    });

    it("should update a candidate's name before election starts", async function () {
      await trustVote.addCandidate(1, "Alice");
      await trustVote.updateCandidate(1, 1, "Alice Updated");
      const candidate = await trustVote.candidates(1, 1);
      expect(candidate.name).to.equal("Alice Updated");
    });

    it("should revert if adding a candidate after election starts", async function () {
      const election = await trustVote.elections(1);
      await time.increaseTo(election.startTime + 1n);

      await expect(trustVote.addCandidate(1, "Charlie"))
        .to.be.revertedWith("Election has already started");
    });

    it("should revert if updating a candidate after election starts", async function () {
      await trustVote.addCandidate(1, "Alice");
      const election = await trustVote.elections(1);
      await time.increaseTo(election.startTime + 1n);

      await expect(trustVote.updateCandidate(1, 1, "Alice Hacked"))
        .to.be.revertedWith("Election has already started");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      // 1. Create election in the future so we can add candidates
      const latest = await time.latest();
      const start = latest + 60; // starts in 60 seconds
      const end = start + ONE_DAY;
      await trustVote.createElection("Vote Test", start, end);

      // 2. Add candidates BEFORE the election starts
      await trustVote.addCandidate(1, "Alice");
      await trustVote.addCandidate(1, "Bob");

      // 3. Register voters
      await trustVote.registerVoter(voter1.address);
      await trustVote.registerVoter(voter2.address);

      // 4. Fast-forward time past start so voting is open
      await time.increaseTo(start + 1);
    });

    it("should allow a registered voter to vote", async function () {
      await trustVote.connect(voter1).vote(1, 1);
      const candidate = await trustVote.candidates(1, 1);
      expect(candidate.voteCount).to.equal(1);
    });

    it("should emit VoteCast event", async function () {
      await expect(trustVote.connect(voter1).vote(1, 1))
        .to.emit(trustVote, "VoteCast")
        .withArgs(1, 1, voter1.address);
    });

    it("should prevent double voting", async function () {
      await trustVote.connect(voter1).vote(1, 1);
      await expect(trustVote.connect(voter1).vote(1, 2))
        .to.be.revertedWith("You have already voted in this election");
    });

    it("should prevent unregistered voters from voting", async function () {
      await expect(trustVote.connect(nonVoter).vote(1, 1))
        .to.be.revertedWith("You are not a registered voter");
    });

    it("should prevent voting for invalid candidate", async function () {
      await expect(trustVote.connect(voter1).vote(1, 99))
        .to.be.revertedWith("Invalid candidate ID");
    });
  });

  describe("Results", function () {
    beforeEach(async function () {
      // Create in future, add candidates, then fast-forward
      const latest = await time.latest();
      const start = latest + 60;
      const end = start + ONE_DAY;
      await trustVote.createElection("Results Test", start, end);

      await trustVote.addCandidate(1, "Alice");
      await trustVote.addCandidate(1, "Bob");

      await trustVote.registerVoter(voter1.address);
      await trustVote.registerVoter(voter2.address);

      // Fast-forward to after start
      await time.increaseTo(start + 1);

      await trustVote.connect(voter1).vote(1, 1); // Alice gets 1
      await trustVote.connect(voter2).vote(1, 1); // Alice gets 2
    });

    it("should return correct results", async function () {
      const [names, voteCounts] = await trustVote.getResults(1);
      expect(names[0]).to.equal("Alice");
      expect(names[1]).to.equal("Bob");
      expect(voteCounts[0]).to.equal(2);
      expect(voteCounts[1]).to.equal(0);
    });

    it("should return election info", async function () {
      const [name, candidateCount] = await trustVote.getElection(1);
      expect(name).to.equal("Results Test");
      expect(candidateCount).to.equal(2);
    });
  });

  describe("Multiple Elections", function () {
    it("should support concurrent elections", async function () {
      const latest = await time.latest();
      const start = latest + 60;
      const end = start + ONE_DAY;

      // Create both elections in the future
      await trustVote.createElection("Election A", start, end);
      await trustVote.createElection("Election B", start, end);

      // Add candidates before start
      await trustVote.addCandidate(1, "A-Candidate1");
      await trustVote.addCandidate(2, "B-Candidate1");

      await trustVote.registerVoter(voter1.address);

      // Fast-forward past start
      await time.increaseTo(start + 1);

      // Vote in both elections
      await trustVote.connect(voter1).vote(1, 1);
      await trustVote.connect(voter1).vote(2, 1);

      const [namesA, votesA] = await trustVote.getResults(1);
      const [namesB, votesB] = await trustVote.getResults(2);

      expect(votesA[0]).to.equal(1);
      expect(votesB[0]).to.equal(1);
    });
  });
});
