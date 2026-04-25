// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrustVote
 * @notice Multi-election voting contract with hybrid voter registration.
 * @dev Supports multiple concurrent elections. Each election has its own
 *      set of candidates and independent voter tracking.
 *
 *      Key design decisions:
 *      - Owner can create elections and add candidates
 *      - Any registered voter can vote once per election
 *      - Results are publicly readable at any time
 *      - Events emitted for all state changes (frontend indexing)
 */
contract TrustVote is Ownable {

    // ======================== Structs ========================

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    struct Election {
        uint256 id;
        string name;
        uint256 candidateCount;
        uint256 startTime;
        uint256 endTime;
        bool exists;
    }

    // ======================== State ========================

    /// @notice Total number of elections created
    uint256 public electionCount;

    /// @notice Mapping from election ID to Election struct
    mapping(uint256 => Election) public elections;

    /// @notice Mapping from election ID => candidate ID => Candidate struct
    mapping(uint256 => mapping(uint256 => Candidate)) public candidates;

    /// @notice Tracks whether a voter has voted in a given election
    /// election ID => voter address => bool
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @notice Tracks which candidate a voter chose (to allow revoting/updates)
    /// election ID => voter address => candidate ID
    mapping(uint256 => mapping(address => uint256)) public voterChoices;

    /// @notice Registered voters (hybrid: also tracked off-chain in MongoDB)
    mapping(address => bool) public registeredVoters;

    // ======================== Events ========================

    event ElectionCreated(uint256 indexed electionId, string name, uint256 startTime, uint256 endTime);
    event CandidateAdded(uint256 indexed electionId, uint256 candidateId, string name);
    event VoteCast(uint256 indexed electionId, uint256 indexed candidateId, address indexed voter);
    event VoteUpdated(uint256 indexed electionId, uint256 indexed oldCandidateId, uint256 indexed newCandidateId, address voter);
    event ElectionEnded(uint256 indexed electionId);
    event VoterRegistered(address indexed voter);

    // ======================== Modifiers ========================

    modifier electionExists(uint256 _electionId) { require(elections[_electionId].exists); _; }
    modifier electionActive(uint256 _electionId) { require(block.timestamp >= elections[_electionId].startTime && block.timestamp <= elections[_electionId].endTime); _; }
    modifier onlyRegistered() { require(registeredVoters[msg.sender]); _; }
    modifier beforeElectionStart(uint256 _electionId) { require(block.timestamp < elections[_electionId].startTime, "Election has already started"); _; }

    constructor() Ownable(msg.sender) {}

    function registerVoter(address _voter) external onlyOwner {
        require(_voter != address(0) && !registeredVoters[_voter]);
        registeredVoters[_voter] = true;
    }

    function addCandidate(uint256 _electionId, string calldata _name) public onlyOwner electionExists(_electionId) {
        require(bytes(_name).length > 0, "Candidate name cannot be empty");
        elections[_electionId].candidateCount++;
        uint256 cId = elections[_electionId].candidateCount;
        candidates[_electionId][cId] = Candidate({id: cId, name: _name, voteCount: 0});
        emit CandidateAdded(_electionId, cId, _name);
    }

    function createElection(string calldata _name, uint256 _startTime, uint256 _endTime) public onlyOwner {
        require(bytes(_name).length > 0 && _endTime > _startTime);
        electionCount++;
        elections[electionCount] = Election({id: electionCount, name: _name, candidateCount: 0, startTime: _startTime, endTime: _endTime, exists: true});
        emit ElectionCreated(electionCount, _name, _startTime, _endTime);
    }

    function createElectionWithCandidates(string calldata _name, uint256 _startTime, uint256 _endTime, string[] calldata _candidateNames) external onlyOwner {
        createElection(_name, _startTime, _endTime);
        uint256 eId = electionCount;
        for (uint256 i = 0; i < _candidateNames.length; i++) {
            addCandidate(eId, _candidateNames[i]);
        }
    }

    function updateCandidate(uint256 _electionId, uint256 _candidateId, string calldata _newName) external onlyOwner electionExists(_electionId) beforeElectionStart(_electionId) {
        require(_candidateId > 0 && _candidateId <= elections[_electionId].candidateCount, "Invalid candidate ID");
        require(bytes(_newName).length > 0, "Candidate name cannot be empty");
        candidates[_electionId][_candidateId].name = _newName;
    }

    function vote(uint256 _eId, uint256 _cId) external electionExists(_eId) electionActive(_eId) onlyRegistered {
        require(_cId > 0 && _cId <= elections[_eId].candidateCount);
        if (hasVoted[_eId][msg.sender]) {
            uint256 oldCId = voterChoices[_eId][msg.sender];
            if (oldCId != _cId) {
                candidates[_eId][oldCId].voteCount--;
                candidates[_eId][_cId].voteCount++;
                voterChoices[_eId][msg.sender] = _cId;
            }
        } else {
            hasVoted[_eId][msg.sender] = true;
            voterChoices[_eId][msg.sender] = _cId;
            candidates[_eId][_cId].voteCount++;
            emit VoteCast(_eId, _cId, msg.sender);
        }
    }

    function getElection(uint256 _eId) external view returns (string memory name, uint256 cCount, uint256 sTime, uint256 eTime) {
        Election storage e = elections[_eId];
        return (e.name, e.candidateCount, e.startTime, e.endTime);
    }

    function getCandidate(uint256 _eId, uint256 _cId) external view returns (string memory name, uint256 vCount) {
        Candidate storage c = candidates[_eId][_cId];
        return (c.name, c.voteCount);
    }

    function getResults(uint256 _eId) external view returns (string[] memory names, uint256[] memory counts) {
        uint256 n = elections[_eId].candidateCount;
        names = new string[](n);
        counts = new uint256[](n);
        for (uint256 i = 1; i <= n; i++) {
            names[i - 1] = candidates[_eId][i].name;
            counts[i - 1] = candidates[_eId][i].voteCount;
        }
        return (names, counts);
    }
}
