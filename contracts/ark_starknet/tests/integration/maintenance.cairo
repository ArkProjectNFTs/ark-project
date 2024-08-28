use starknet::{ContractAddress, contract_address_const};
use ark_starknet::interfaces::{IMaintenanceDispatcher, IMaintenanceDispatcherTrait};
use ark_starknet::executor::executor;

use snforge_std as snf;
use snf::cheatcodes::events::{EventFetcher, EventAssertions};
use snf::{ContractClass, ContractClassTrait, CheatTarget, spy_events, SpyOn};

use super::super::common::setup::deploy_executor;

#[test]
fn admin_can_change_executor_state() {
    let admin = contract_address_const::<'admin'>();
    let executor_address = deploy_executor();
    let executor = IMaintenanceDispatcher { contract_address: executor_address };
    let mut spy = spy_events(SpyOn::One(executor_address));
    snf::start_prank(snf::CheatTarget::One(executor_address), admin);
    executor.set_maintenance_mode(true);
    assert!(executor.is_in_maintenance(), "Executor should be in maintenance");
    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::ExecutorInMaintenance(
                        executor::ExecutorInMaintenance { on: true, }
                    )
                )
            ]
        );

    executor.set_maintenance_mode(false);
    assert!(!executor.is_in_maintenance(), "Executor should not be in maintenance");
    spy
        .assert_emitted(
            @array![
                (
                    executor_address,
                    executor::Event::ExecutorInMaintenance(
                        executor::ExecutorInMaintenance { on: false, }
                    )
                )
            ]
        );

    snf::stop_prank(snf::CheatTarget::One(executor_address));
}

#[test]
#[should_panic(expected: ('Unauthorized admin address',))]
fn only_admin_can_change_disable_executor() {
    let executor_address = deploy_executor();
    let alice = contract_address_const::<'alice'>();

    snf::start_prank(snf::CheatTarget::One(executor_address), alice);
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(true);
    snf::stop_prank(snf::CheatTarget::One(executor_address));
}

#[test]
#[should_panic(expected: ('Unauthorized admin address',))]
fn only_admin_can_change_enable_executor() {
    let executor_address = deploy_executor();
    let alice = contract_address_const::<'alice'>();

    snf::start_prank(snf::CheatTarget::One(executor_address), alice);
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(false);
    snf::stop_prank(snf::CheatTarget::One(executor_address));
}
