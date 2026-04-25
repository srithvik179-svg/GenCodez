export const TRUST_VOTE_ABI = [
  "function vote(uint256 _eId, uint256 _cId) external",
  "function getResults(uint256 _eId) external view returns (string[] memory names, uint256[] memory counts)",
  "function getElection(uint256 _eId) external view returns (string memory name, uint256 cCount, uint256 sTime, uint256 eTime)",
  "function getCandidate(uint256 _eId, uint256 _cId) external view returns (string memory name, uint256 vCount)",
  "event VoteCast(uint256 indexed electionId, uint256 indexed candidateId, address indexed voter)"
];
