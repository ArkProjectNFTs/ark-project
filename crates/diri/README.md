# Diri: arckchain indexer

Diri is the Arkchain index library.
By implementing the same logic as `pontos`, by having a `Storage`
trait that defines all operations on the database, Diri collects
the events from the Arkchain.

# Storage and order lifecycle

The core entity of Diri storage is an `order`. An order is always emitted
when an order is placed, with the event `OrderPlaced`. The order can then
be stored and mapped to a specific block from which is was created.

Once stored, the order, identified by it's `order_hash`, has it's lifecycle
which is the one state among the following:
0. The order is created and open (`OrderPladced`).
1. The order is cancelled (`OrderCancelled`).
2. The order is fulfilled (`OrderFulfilled`).
3. The order is executed (`OrderExecuted`).

The concept of `expiry` does not apply to Diri logic. We only care about the
lifecycle of an order through the events.

# Re-indexing

If a re-indexation of a block is required for any reason, it's important that
the storage can clean all the data that was found in a specific block.
This ensures a robust way to re-index some of the blocks where an error may
have occurred.
