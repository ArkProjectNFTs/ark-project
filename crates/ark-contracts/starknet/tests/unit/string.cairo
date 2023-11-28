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
