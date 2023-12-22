use traits::Into;

// locals
use super::constants;

fn hash_u256(n: u256) -> felt252 {
  let mut hash = pedersen::pedersen(0, constants::U256_TYPE_HASH);
  hash = pedersen::pedersen(hash, n.low.into());
  hash = pedersen::pedersen(hash, n.high.into());

  pedersen::pedersen(hash, 3)
}