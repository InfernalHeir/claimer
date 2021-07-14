// SPDX-License-Identifier: MIT;

pragma solidity 0.8.0;

import "./access/Ownable.sol";
import "./libraries/SafeMath.sol";
import "./libraries/SafeERC20.sol";
import "./interfaces/IERC20.sol";

contract Claimer is Ownable {
  /// @notice using SafeMath library for arithmetic operations.
  using SafeMath for uint256;

  /// @notice using SafeERC20 library for safe ERC20 Actions.
  using SafeERC20 for IERC20;

  /// @notice ProjectDetails store project related data.
  struct ProjectDetails {
    address oldImplementation;
    address newImplementation;
    uint256 totalSwapTokens;
  }

  /// @notice mapping for storing Project details.
  mapping(bytes32 => ProjectDetails) public projects;

  event ProjectAdded(
    bytes32 indexed projectHash,
    address indexed oldImplementation,
    address indexed newImplementation,
    uint256 totalSwapTokens,
    uint256 when
  );

  event Swap(
    bytes32 indexed projectHash,
    address indexed userAddress,
    uint256 swapAmount,
    uint256 time
  );

  /// @notice construct the claimer contract.
  constructor(address _trustedForwarder) Ownable(_msgSender()) {
    trustedForwarder = _trustedForwarder;
  }

  function addProject(
    address _oldImplementation,
    address _newImplementation,
    uint256 _totalSwapTokens
  ) external onlyOwner {
    require(
      _oldImplementation != address(0) && _newImplementation != address(0),
      "addProject:: invalid implementation addresses"
    );
    require(_totalSwapTokens > 0, "addProject:: invaild totalSwapTokens");

    bytes32 projectHash = keccak256(
      abi.encodePacked(_oldImplementation, _newImplementation)
    );

    projects[projectHash] = ProjectDetails({
      oldImplementation: _oldImplementation,
      newImplementation: _newImplementation,
      totalSwapTokens: _totalSwapTokens
    });

    emit ProjectAdded(
      projectHash,
      _oldImplementation,
      _newImplementation,
      _totalSwapTokens,
      block.timestamp
    );
  }

  function swap(bytes32 projectHash, uint256 amount)
    external
    whenNotPaused
    returns (bool)
  {
    require(amount > 0, "swap:: invalid amount");

    ProjectDetails memory project = projects[projectHash];

    require(
      project.totalSwapTokens >= amount,
      "swap::amount exceeds totalSwapTokens"
    );

    _swap(
      projectHash,
      project.oldImplementation,
      project.newImplementation,
      amount
    );

    return true;
  }

  function _swap(
    bytes32 projectHash,
    address oldImplementation,
    address newImplementation,
    uint256 swapAmount
  ) internal {
    projects[projectHash].totalSwapTokens = projects[projectHash]
    .totalSwapTokens
    .sub(swapAmount);
    // swap old token with new one
    IERC20(oldImplementation).safeTransferFrom(
      _msgSender(),
      address(this),
      swapAmount
    );

    require(
      IERC20(newImplementation).balanceOf(address(this)) >= swapAmount,
      "_swap:: Swap Failed"
    );
    // send out the new tokens
    IERC20(newImplementation).safeTransfer(_msgSender(), swapAmount);

    emit Swap(projectHash, _msgSender(), swapAmount, block.timestamp);
  }

  function updateProjectDetails(
    bytes32 oldProjectHash,
    address _oldImplementation,
    address _newImplementation,
    uint256 _totalSwapTokens
  ) external onlyOwner returns (bool) {
    require(
      _oldImplementation != address(0) && _newImplementation != address(0),
      "updateProjectDetails:: invalid implementation addresses"
    );
    require(
      _totalSwapTokens > 0,
      "updateProjectDetails:: invaild totalSwapTokens"
    );

    delete projects[oldProjectHash];

    bytes32 newProjectHash = keccak256(
      abi.encodePacked(_oldImplementation, _newImplementation)
    );

    projects[newProjectHash] = ProjectDetails({
      oldImplementation: _oldImplementation,
      newImplementation: _newImplementation,
      totalSwapTokens: _totalSwapTokens
    });

    emit ProjectAdded(
      newProjectHash,
      _oldImplementation,
      _newImplementation,
      _totalSwapTokens,
      block.timestamp
    );

    return true;
  }

  function pause() external onlyOwner returns (bool) {
    _pause();
    return true;
  }

  function unpause() external onlyOwner returns (bool) {
    _unpause();
    return true;
  }

  /**
   * Override this function.
   * This version is to keep track of BaseRelayRecipient you are using
   * in your contract.
   */
  function versionRecipient() external pure override returns (string memory) {
    return "2";
  }

  function updateTrustForwarder(address _newTrustForwarder) external onlyOwner {
    trustedForwarder = _newTrustForwarder;
  }
}
