//! An opiniated string implementation, waiting
//! the long string being supported by Cairo natively.
//!
//! Max size = 256 felts for now.
//!
//! Can be tracked here: https://github.com/orgs/starkware-libs/projects/1/views/1
//!
//! LongString storage is manually handled for now.
//! In fact, the new implementation of Store implies a fixed size.
//! https://github.com/starkware-libs/cairo/blob/v2.1.0/corelib/src/starknet/storage_access.cairo#L64
//!
//! For this reason, the long strings are handled directly
//! with storage system calls.
//!
//! IMPORTANT: this code will be removed once long string are supported.

use poseidon::poseidon_hash_span;
use starknet::{ContractAddress, SyscallResultTrait};

const LONG_STRING_BASE_KEY: felt252 = 'long string storage';

// Must remain equal to 0 for now.
const ADDRESS_DOMAIN: u32 = 0;

/// LongString represented internally as a list of short string.
#[derive(Copy, Drop, Serde)]
struct LongString {
    // Span of felt252 (short string) to be concatenated
    // to have the complete long string.
    // We take advantage of the Span serialization where
    // the size is always present.
    content: Span<felt252>,
}

/// Shortcut to access length.
#[generate_trait]
impl LongStringLen of LongStringLenTrait {
    fn len(self: LongString) -> usize {
        self.content.len()
    }

    fn empty(self: LongString) -> bool {
        self.content.len() == 0
    }
}

#[generate_trait]
impl LongStringSnapLen of LongStringSnapLenTrait {
    fn len(self: @LongString) -> usize {
        (*self).content.len()
    }

    fn empty(self: @LongString) -> bool {
        (*self).content.len() == 0
    }
}

/// Shortcode to access index in long string.
impl LongStringIndexView of IndexView<LongString, usize, @felt252> {
    #[inline(always)]
    fn index(self: @LongString, index: usize) -> @felt252 {
        (*self).content.at(index)
    }
}

/// PartialEq.
impl LongStringPartialEq of PartialEq<LongString> {
    fn eq(lhs: @LongString, rhs: @LongString) -> bool {
        if lhs.len() != rhs.len() {
            return false;
        }

        let mut i = 0;
        loop {
            if i == lhs.len().into() {
                break true;
            }

            if lhs[i] != rhs[i] {
                break false;
            }

            i += 1;
        }
    }

    fn ne(lhs: @LongString, rhs: @LongString) -> bool {
        if lhs.len() != rhs.len() {
            return true;
        }

        let mut i = 0;
        loop {
            if i == lhs.len().into() {
                break false;
            }

            if lhs[i] != rhs[i] {
                break true;
            }

            i += 1;
        }
    }
}

/// Initializes a LongString from a short string.
impl Felt252IntoLongString of Into<felt252, LongString> {
    ///
    fn into(self: felt252) -> LongString {
        let mut content = ArrayTrait::<felt252>::new();
        content.append(self);

        LongString { content: content.span() }
    }
}

/// Initializes a LongString from Array<felt252>.
impl ArrayIntoLongString of Into<Array<felt252>, LongString> {
    ///
    fn into(self: Array<felt252>) -> LongString {
        LongString { content: self.span() }
    }
}

/// Long string from span.
impl SpanFeltTryIntoLongString of TryInto<Span<felt252>, LongString> {
    ///
    fn try_into(self: Span<felt252>) -> Option<LongString> {
        if self.len() == 0_usize {
            Option::None(())
        } else if self.len() == 1_usize {
            let ll: felt252 = *self[0];
            Option::Some(ll.into())
        } else {
            Option::Some(LongString { content: self })
        }
    }
}

/// Long string may be a single felt or an already
/// serialized LongString for contract that supports it.
impl SpanFeltSerializedTryIntoLongString of TryInto<Span<felt252>, LongString> {
    ///
    fn try_into(self: Span<felt252>) -> Option<LongString> {
        if self.len() == 0_usize {
            Option::None(())
        } else if self.len() == 1_usize {
            Option::Some((*self[0]).into())
        } else {
            // We need to skip the first felt252 which is the length.
            let len = (*self[0]).try_into().expect('Bad LongString len from span');

            let mut content: Array<felt252> = ArrayTrait::new();

            let mut i = 1_usize;
            loop {
                if i == len + 1 {
                    break ();
                }

                content.append(*self[i]);

                i += 1;
            };

            Option::Some(LongString { content: content.span() })
        }
    }
}

/// Reads a long string from the storage for the given keys.
fn long_string_storage_read(key1: felt252, key2: felt252) -> LongString {
    let key = array![LONG_STRING_BASE_KEY, key1, key2];

    let base = starknet::storage_base_address_from_felt252(poseidon_hash_span(key.span()));

    let mut offset = 0;

    // We must first read the length to iterate over the offsets.
    let length: felt252 = starknet::storage_read_syscall(
        ADDRESS_DOMAIN, starknet::storage_address_from_base_and_offset(base, offset)
    )
        .unwrap_syscall();

    offset += 1;

    let mut value = array![length];

    loop {
        // -1 as the first offset was the length, already processed.
        if length == offset.into() - 1 {
            break ();
        }

        value
            .append(
                starknet::storage_read_syscall(
                    ADDRESS_DOMAIN, starknet::storage_address_from_base_and_offset(base, offset)
                )
                    .unwrap_syscall()
            );

        offset += 1;
    };

    let mut vspan = value.span();
    Serde::<LongString>::deserialize(ref vspan).unwrap()
}

/// Writes a long string in the storage for the given keys.
fn long_string_storage_write(key1: felt252, key2: felt252, value: LongString) {
    let key = array![LONG_STRING_BASE_KEY, key1, key2];

    let base = starknet::storage_base_address_from_felt252(poseidon_hash_span(key.span()));

    let mut offset = 0;

    // At offset 0, we always have the length, as it's how
    // a span is serialized.
    let mut buf = array![];
    value.serialize(ref buf);

    loop {
        match buf.pop_front() {
            Option::Some(v) => {
                starknet::storage_write_syscall(
                    ADDRESS_DOMAIN, starknet::storage_address_from_base_and_offset(base, offset), v
                );
                offset += 1
            },
            Option::None(_) => {
                break ();
            },
        };
    };
}


// ** TESTING **

/// Tests contracts. Must be out of #[cfg(test)] as they are not declarable using
/// declare cheatcode of starknet foundry if under test config.
/// Also, we can't declare them as deploy syscall is not allowed in test (yet?).
#[starknet::interface]
trait IContract1<T> {
    fn get_ll(self: @T) -> LongString;
    fn set_ll(ref self: T, ll: LongString);

    fn get_ll_value(self: @T, key: u256) -> LongString;
    fn set_ll_value(ref self: T, key: u256, value: LongString);
}

#[starknet::contract]
mod contract_ll_test {
    use super::{LongString, IContract1, long_string_storage_read, long_string_storage_write};
    use traits::Into;

    #[storage]
    struct Storage {}

    #[external(v0)]
    impl Contract1Impl of IContract1<ContractState> {
        fn get_ll(self: @ContractState) -> LongString {
            long_string_storage_read(0, 1)
        }

        fn set_ll(ref self: ContractState, ll: LongString) {
            long_string_storage_write(0, 1, ll)
        }

        fn get_ll_value(self: @ContractState, key: u256) -> LongString {
            long_string_storage_read(key.low.into(), key.high.into())
        }

        fn set_ll_value(ref self: ContractState, key: u256, value: LongString) {
            long_string_storage_write(key.low.into(), key.high.into(), value)
        }
    }
}

///
#[cfg(test)]
mod tests {
    use debug::PrintTrait;
    use serde::Serde;
    use array::{ArrayTrait, SpanTrait};
    use traits::{Into, TryInto};
    use option::OptionTrait;
    use result::ResultTrait;
    use super::{
        LongString, LongStringLenTrait, LongStringIndexView, LongStringSerde, ArrayIntoLongString,
        SpanFeltTryIntoLongString, long_string_storage_write, long_string_storage_read, IContract1,
        IContract1Dispatcher, IContract1DispatcherTrait
    };

    use snforge_std::{declare, deploy, PreparedContract};

    /// TODO: Can't use starknet foundry here as test contracts are not yet supported.
    fn deploy_contract1() -> IContract1Dispatcher {
        let class_hash = declare('contract_ll_test');
        let prepared = PreparedContract { class_hash: class_hash, constructor_calldata: @array![] };

        let contract_address = deploy(prepared).unwrap();
        IContract1Dispatcher { contract_address }
    }

    /// Should correctly get LongString from storage.
    #[test]
    #[available_gas(2000000000)]
    fn from_storage() {
        let c1: IContract1Dispatcher = deploy_contract1();

        let empty: LongString = array![].into();
        c1.set_ll(empty);
        let mut ll = c1.get_ll();
        assert(ll.len() == 0, 'bad empty storage');

        c1.set_ll('salut'.into());
        ll = c1.get_ll();
        assert(ll.len() == 1, 'bad len from storage');
        assert(*ll[0] == 'salut', 'bad content from storage');

        let token1 = 223_u256;
        let token2 = 99988_u256;
        c1.set_ll_value(token1, 'token1'.into());
        c1.set_ll_value(token2, 'token2'.into());

        let ll1 = c1.get_ll_value(token1);
        assert(ll1.len() == 1, 'bad ll1 len');
        assert(*ll1[0] == 'token1', 'bad ll1 content');

        let ll2 = c1.get_ll_value(token2);
        assert(ll2.len() == 1, 'bad ll2 len');
        assert(*ll2[0] == 'token2', 'bad ll2 content');

        assert(1 == 1, 'aaa');
    }

    /// Should init a LongString from Span<felt252>.
    #[test]
    #[available_gas(2000000000)]
    fn partial_eq() {
        let l1: LongString = 'abcd'.into();
        let l2: LongString = 'abcd'.into();
        let l3: LongString = 'edfe'.into();
        let l4: LongString = '1102832'.into();

        assert(l1 == l2, 'bad eq');
        assert(l1 != l3, 'bad ne same len');
        assert(l1 != l3, 'bad ne diff len');
    }

    /// Should init a LongString from felt252.
    #[test]
    #[available_gas(2000000000)]
    fn from_felt252() {
        let u1: LongString = 'https:...'.into();
        assert(u1.len() == 1, 'll len');
        assert(*u1[0] == 'https:...', 'content 0');
    }

    /// Should init a LongString from Array<felt252>.
    #[test]
    #[available_gas(2000000000)]
    fn from_array_felt252() {
        let content = array![
            'ipfs://bafybeigdyrzt5sfp7udm7h', 'u76uh7y26nf3efuylqabf3oclgtqy5', '5fbzdi'
        ];

        let u1: LongString = content.into();
        assert(u1.len() == 3, 'll len');
        assert(*u1[0] == 'ipfs://bafybeigdyrzt5sfp7udm7h', 'content 0');
        assert(*u1[1] == 'u76uh7y26nf3efuylqabf3oclgtqy5', 'content 1');
        assert(*u1[2] == '5fbzdi', 'content 2');

        let mut content_empty = array![];

        let u2: LongString = content_empty.into();
        assert(u2.len() == 0, 'll len');
    }

    /// Should init a LongString from Span<felt252>.
    #[test]
    #[available_gas(2000000000)]
    fn from_span_felt252() {
        let mut a: Array<felt252> = array!['https:...'];

        let u1: LongString = (a.span()).try_into().unwrap();
        assert(u1.len() == 1, 'll len');
        assert(*u1[0] == 'https:...', 'content 0');
    }

    /// Should serialize a LongString.
    #[test]
    #[available_gas(2000000000)]
    fn serialize() {
        let mut content = array!['hello', 'world'];

        let u1: LongString = content.into();

        let mut buf = array![];
        u1.serialize(ref buf);

        assert(buf.len() == 3, 'Serialized buf len');

        assert(*buf[0] == 2, 'Expected len');
        assert(*buf[1] == 'hello', 'Expected item 0');
        assert(*buf[2] == 'world', 'Expected item 1');
    }

    /// Should deserialize a LongString.
    #[test]
    #[available_gas(2000000000)]
    fn deserialize() {
        let mut buf = array![2, 'hello', 'world'];

        let mut sp = buf.span();

        let ll = Serde::<LongString>::deserialize(ref sp).unwrap();
        assert(ll.len() == 2, 'Bad deserialized len');
        assert(*ll[0] == 'hello', 'Expected item 0');
        assert(*ll[1] == 'world', 'Expected item 1');
    }
}
