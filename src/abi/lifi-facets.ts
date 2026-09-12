/**
 * Human-readable LI.FI facet fragments used to decode quote calldata.
 * @lifi/contract-types is not published on npm; we embed the signatures we need.
 */
export const LIFI_FACET_FRAGMENTS = [
  "function swapTokensMultipleV3ERC20ToERC20(bytes32 _transactionId, string _integrator, string _referrer, address _receiver, uint256 _minAmount, (address callTo, address approveTo, address sendingAssetId, address receivingAssetId, uint256 fromAmount, bytes callData, bool requiresDeposit)[] _swapData)",
  "function swapTokensSingleV3ERC20ToERC20(bytes32 _transactionId, string _integrator, string _referrer, address _receiver, uint256 _minAmount, (address callTo, address approveTo, address sendingAssetId, address receivingAssetId, uint256 fromAmount, bytes callData, bool requiresDeposit) _swapData)",
  "function swapTokensSingleV3ERC20ToNative(bytes32 _transactionId, string _integrator, string _referrer, address _receiver, uint256 _minAmount, (address callTo, address approveTo, address sendingAssetId, address receivingAssetId, uint256 fromAmount, bytes callData, bool requiresDeposit) _swapData)",
  "function swapTokensSingleV3NativeToERC20(bytes32 _transactionId, string _integrator, string _referrer, address _receiver, uint256 _minAmount, (address callTo, address approveTo, address sendingAssetId, address receivingAssetId, uint256 fromAmount, bytes callData, bool requiresDeposit) _swapData)",
  "function swapTokensGeneric(bytes32 _transactionId, string _integrator, string _referrer, address _receiver, uint256 _minAmount, (address callTo, address approveTo, address sendingAssetId, address receivingAssetId, uint256 fromAmount, bytes callData, bool requiresDeposit)[] _swapData)",
] as const;
