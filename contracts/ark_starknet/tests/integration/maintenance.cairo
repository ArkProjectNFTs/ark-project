use ark_starknet::executor::executor;
use ark_starknet::interfaces::{IMaintenanceDispatcher, IMaintenanceDispatcherTrait};

use snforge_std::{ContractClass, ContractClassTrait, cheat_caller_address, CheatSpan, spy_events, EventSpyAssertionsTrait,};

use super::super::common::setup::deploy_executor;

#[test]
fn admin_can_change_executor_state() {
    let admin = contract_address_const::<'admin'>();
    let executor_address = deploy_executor();
    let executor = IMaintenanceDispatcher { contract_address: executor_address };
    
    let mut spy = spy_events();
    
    cheat_caller_address(executor_address, admin, CheatSpan::TargetCalls(1));
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
    let mut spy = spy_events();
    cheat_caller_address(executor_address, admin, CheatSpan::TargetCalls(1));
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
}

#[test]
#[should_panic(expected: ('Unauthorized admin address',))]
fn only_admin_can_change_disable_executor() {
    let executor_address = deploy_executor();
    let alice = contract_address_const::<'alice'>();

    cheat_caller_address(executor_address, alice, CheatSpan::TargetCalls(1));
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(true);
}

#[test]
#[should_panic(expected: ('Unauthorized admin address',))]
fn only_admin_can_change_enable_executor() {
    let executor_address = deploy_executor();
    let alice = contract_address_const::<'alice'>();

    cheat_caller_address(executor_address, alice, CheatSpan::TargetCalls(1));
    IMaintenanceDispatcher { contract_address: executor_address }.set_maintenance_mode(false);
}
