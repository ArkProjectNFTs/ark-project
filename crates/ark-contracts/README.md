# Starknet Cairo contract

## Install Scarb via asdf
Install Scarb via asdf for easy version management.
[Scarb doc here](https://docs.swmansion.com/scarb/).

The Scarb version must always match the Cairo version.
Latest version for now: `2.3.1`.
```bash
asdf install scarb 2.3.1

# Set the global version of Scarb.
asdf global scarb 2.3.1

# If needed in local, which generated a `.tool-versions` file.
asdf local scarb 2.3.1
```

## Cairo basics

As rust, we need an entry point in the library -> `lib.cairo`.
In `Scarb.toml` always have:
```toml
[[target.starknet-contract]]
sierra = true
casm = true
```
To use `sn-foundry` and use the sierra file to declare classes on-chain.

Implementation in Cairo are NAMED. Example:

```rust
// RUST (implicit self)
trait MyTrait {
    fn func(&self) ..
}

struct MyStruct {}

impl MyTrait for MyStruct {..}

// CAIRO (explicit self)
impl MyTraitForMyStruct of MyTrait {
    fn func(self: MyStruct) ...
}
```

In cairo, to add a module in a library, you must create
a file that has the same name of your folder..!

To use modules, you can use `super` or you have to use
the name of the package in the `Scarb.toml` file.

For testing, every test is under `tests` folder,
with the same folder names as `src`, but all modules
must start with `test_`.

## Storage in cairo
Not all data type can be stored in the storage.
Array cannot for instance.
For mapping, we can use LegacyMap, and for array like, we can use the `List` from Alexandria.
Also, consider using the dictionary felt252: https://book.cairo-lang.org/ch03-02-dictionaries.html?highlight=felt252#entry-and-finalize.

## External
In cairo, to have a function exposed as entry point that can be called from the outside worl, it need to have the `#[external(v0)]` attribute.

For view (readonly) -> We don't modify the state, so it's `self: @ContractState)`.

For external (write) -> We want to modify the state, we use `ref self: ContractState)`.

